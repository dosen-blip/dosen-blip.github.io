import { useEffect, useRef } from "react"

// The live wall needs a GPU (WebGL2) and motion. Everywhere else the hero shows a baked still, as it does when a phone is
// on Save-Data, is short of memory, can't get the wall up in time or can't keep it running.
const PHONE_QUERY = "(max-width: 809.98px)"
const PHONE_START_LIMIT = 9000 // ms

function canRunLive() {
  if (!window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) return false
  if (navigator.connection?.saveData) return false
  if (window.matchMedia(PHONE_QUERY).matches && navigator.deviceMemory && navigator.deviceMemory < 3) return false
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
 * first frame is drawn, or "still" when the page should letter the wordmark over the baked plate instead. `moreRef` is
 * the part of the stage below the first screen: the wall carries on behind it at the same scale.
 */
export function InstinctScene({ slotRef, moreRef, onMode }) {
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
    const phone = window.matchMedia(PHONE_QUERY).matches
    const fallBack = () => {
      window.clearTimeout(startLimit)
      if (controller.signal.aborted) return
      controller.abort()
      report("still")
    }
    const startLimit = phone ? window.setTimeout(fallBack, PHONE_START_LIMIT) : 0
    report("loading")
    import("../scenes/instinct/hero.js")
      .then(({ createHero }) => createHero(host, {
        layout: phone ? "phone" : "case",
        quality: phone ? "phone" : "full",
        anchor: () => (slotRef.current ? boxWithin(slotRef.current, stage) : null),
        frameHeight: () => stage.clientHeight - (moreRef.current?.offsetHeight ?? 0),
        pointerTarget: stage,
        onStart: () => {
          window.clearTimeout(startLimit)
          report("live")
        },
        onFail: fallBack,
        signal: controller.signal,
      }))
      .then((hero) => {
        // the copy can settle a pixel or two once the fonts arrive; the wordmark follows it
        if (hero) document.fonts?.ready.then(() => { if (!controller.signal.aborted) hero.relayout() })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.warn("[instinct] live scene unavailable, showing the still", error)
        fallBack()
      })
    return () => {
      window.clearTimeout(startLimit)
      controller.abort()
    }
  }, [slotRef, moreRef])

  return <div ref={hostRef} className="ig-scene" aria-hidden="true" />
}
