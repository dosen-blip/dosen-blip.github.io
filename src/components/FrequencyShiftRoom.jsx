import { useEffect, useRef } from "react"

// The room needs a GPU (WebGL2) and motion. Everywhere else the hero keeps its photograph, as it does when a phone is
// on Save-Data, is short of memory, can't get the room up in time or can't keep it running.
const PHONE_QUERY = "(pointer: coarse), (max-width: 759.98px)"
const PHONE_START_LIMIT = 9000 // ms

function canRunRoom() {
  if (typeof window === "undefined") return false
  if (!window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) return false
  if (navigator.connection?.saveData) return false
  if (window.matchMedia(PHONE_QUERY).matches && navigator.deviceMemory && navigator.deviceMemory < 3) return false
  return typeof WebGL2RenderingContext !== "undefined"
}

/**
 * The Frequency Shift laser room, fixed behind the whole case study: the site's own scene, lit from behind the page's
 * neon wordmark (`wordmarkRef`), which stays the page's own. Reports its state through `onMode`: "loading", "live"
 * once the first frame is drawn, or "still" when the page should keep its photograph instead.
 */
export function FrequencyShiftRoom({ pageRef, wordmarkRef, artwork, onMode }) {
  const stageRef = useRef(null)
  const onModeRef = useRef(onMode)

  useEffect(() => {
    onModeRef.current = onMode
  }, [onMode])

  useEffect(() => {
    const stage = stageRef.current
    const page = pageRef.current
    const wordmark = wordmarkRef.current
    if (!stage || !page || !wordmark) return undefined
    const report = (mode) => onModeRef.current?.(mode)
    if (!canRunRoom()) {
      report("still")
      return undefined
    }

    const controller = new AbortController()
    const phone = window.matchMedia(PHONE_QUERY).matches
    let room = null
    const fallBack = () => {
      window.clearTimeout(startLimit)
      if (controller.signal.aborted) return
      controller.abort()
      room?.destroy()
      room = null
      report("still")
    }
    const startLimit = phone ? window.setTimeout(fallBack, PHONE_START_LIMIT) : 0
    report("loading")
    import("../scenes/laser-room/caseStudy.js")
      .then(({ mountCaseStudyRoom }) => mountCaseStudyRoom(stage, {
        page,
        wordmark,
        artwork,
        phone,
        signal: controller.signal,
        onStart: () => {
          window.clearTimeout(startLimit)
          report("live")
        },
        onFail: fallBack,
      }))
      .then((handle) => {
        if (!handle) return
        if (controller.signal.aborted) {
          handle.destroy()
          return
        }
        room = handle
        // the copy can settle a pixel or two once the fonts arrive; the sign's light follows the wordmark
        document.fonts?.ready.then(() => { if (!controller.signal.aborted) room?.relayout() })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.warn("[frequency-shift] laser room unavailable, keeping the photograph", error)
        fallBack()
      })
    return () => {
      window.clearTimeout(startLimit)
      controller.abort()
      room?.destroy()
      room = null
    }
  }, [pageRef, wordmarkRef, artwork])

  return (
    <div ref={stageRef} className="fs-room-stage" aria-hidden="true">
      <div className="fs-room-veil" />
    </div>
  )
}
