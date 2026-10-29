import { useEffect, useRef } from "react"

// The live wall needs a desktop-sized screen, a GPU (WebGL2) and motion; everywhere else the hero shows a baked still.
const LIVE_QUERY = "(min-width: 810px) and (prefers-reduced-motion: no-preference)"

function canRunLive() {
  if (!window.matchMedia?.(LIVE_QUERY).matches) return false
  if (navigator.connection?.saveData) return false
  return typeof WebGL2RenderingContext !== "undefined"
}

// The slot's box inside `ancestor`, from layout offsets (so the copy's entrance animation can't skew it).
function boxWithin(node, ancestor) {
  let x = 0
  let y = 0
  for (let current = node; current && current !== ancestor; current = current.offsetParent) {
    x += current.offsetLeft
    y += current.offsetTop
  }
  const { width, height } = node.getBoundingClientRect()
  return { x, y, w: width, h: height }
}

/**
 * The Instinct Groove wall behind the case-study hero: the lab's WebGL scene, with the carved wordmark landing on
 * `slotRef` so it lines up with the copy around it. Reports its state through `onMode`: "loading", "live" once the
 * first frame is drawn, or "still" when the page should letter the wordmark over the baked plate instead.
 */
export function InstinctScene({ slotRef, onMode }) {
  const hostRef = useRef(null)
  const onModeRef = useRef(onMode)

  useEffect(() => {
    onModeRef.current = onMode
  }, [onMode])

  useEffect(() => {
    const host = hostRef.current
    const stage = host?.parentElement
    if (!host || !stage) return undefined
    const report = (mode) => onModeRef.current?.(mode)
    if (!canRunLive()) {
      report("still")
      return undefined
    }

    const controller = new AbortController()
    report("loading")
    import("../scenes/instinct/hero.js")
      .then(({ createHero }) => createHero(host, {
        layout: "case",
        anchor: () => (slotRef.current ? boxWithin(slotRef.current, stage) : null),
        pointerTarget: stage,
        onStart: () => report("live"),
        signal: controller.signal,
      }))
      .then((hero) => {
        // the copy can settle a pixel or two once the fonts arrive; the wordmark follows it
        if (hero) document.fonts?.ready.then(() => { if (!controller.signal.aborted) hero.relayout() })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.warn("[instinct] live scene unavailable, showing the still", error)
        report("still")
      })
    return () => controller.abort()
  }, [slotRef])

  return <div ref={hostRef} className="ig-scene" aria-hidden="true" />
}
