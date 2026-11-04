import { useEffect, useRef, useState } from "react"
import { ART_PRESETS, createArtJob } from "./glassFolderArt"

const recipeOf = (art) => (typeof art === "string" ? ART_PRESETS[art] : art)

// One shared painter: every folder and card on the page queues its art here and the queue spends a few
// milliseconds a frame, so a row of them never janks.

const artCache = new Map()
const queue = []
let pumping = false

function pump() {
  if (pumping) return
  pumping = true
  const tick = () => {
    const until = performance.now() + 7
    while (queue.length && performance.now() < until) {
      const head = queue[0]
      if (head.job.step(4)) {
        queue.shift()
        const c = document.createElement("canvas")
        c.width = head.job.width
        c.height = head.job.height
        c.getContext("2d")?.putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0)
        head.done(c)
      }
    }
    if (queue.length) requestAnimationFrame(tick)
    else pumping = false
  }
  requestAnimationFrame(tick)
}

/** Lower priority paints first: back panels (0) before the files tucked behind glass (1), then cards (2). */
function paint(recipe, seed, w, h, priority) {
  const key = JSON.stringify([recipe, seed, w, h])
  let p = artCache.get(key)
  if (!p) {
    p = new Promise((done) => {
      // never jump the job already in progress
      let at = queue.length
      while (at > 1 && queue[at - 1].priority > priority) at--
      queue.splice(at, 0, { job: createArtJob(w, h, recipe, seed), priority, done })
      pump()
    })
    artCache.set(key, p)
  }
  return p
}

/**
 * The generated artwork in a canvas, painted at w × h × density. It stays blank where there is no canvas support
 * (the server, jsdom). `fluid` leaves the displayed size to the stylesheet; otherwise it is shown at w × h.
 */
export function ArtCanvas({ art, seed, w, h, density = 1, priority = 0, fluid = false, className }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const key = JSON.stringify(recipeOf(art))
  const pw = Math.round(w * density)
  const ph = Math.round(h * density)

  useEffect(() => {
    if (typeof ImageData === "undefined") return undefined
    let live = true
    paint(JSON.parse(key), seed, pw, ph, priority).then((src) => {
      const c = ref.current
      if (!live || !c) return
      c.width = src.width
      c.height = src.height
      c.getContext("2d")?.drawImage(src, 0, 0)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [key, seed, pw, ph, priority])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      data-ready={ready || undefined}
      style={fluid ? undefined : { width: w, height: h, maxWidth: "none" }}
    />
  )
}
