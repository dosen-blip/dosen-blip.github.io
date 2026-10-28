import { useEffect, useRef } from "react"
import { transition } from "../transitions/transitionStore"
import { useTransitionPhase } from "../transitions/useTransitionPhase"
import { DPR_MAX, drawWipe, wipeFrame } from "../transitions/wipe"

/**
 * The canvas that covers the page between routes (see transitions/wipe.js for what it draws).
 * It only exists in the DOM while a transition runs, and is drawn straight from the store's frame loop,
 * so nothing re-renders in React per frame.
 */
export function TransitionOverlay() {
  const ref = useRef(null)
  const phase = useTransitionPhase()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext?.("2d")
    if (!ctx) return undefined
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1)
      canvas.width = Math.round((width + 2) * dpr)
      canvas.height = Math.round((height + 2) * dpr)
      canvas.style.width = `${width + 2}px`
      canvas.style.height = `${height + 2}px`
    }
    const draw = () => {
      if (!transition.active) return
      const { cover, phase } = transition
      canvas.style.opacity = wipeFrame(width, height, cover, phase).opacity
      drawWipe(ctx, { width, height, dpr, cover, phase })
    }

    resize()
    window.addEventListener("resize", resize)
    const stopWatching = transition.watchFrames(draw)
    return () => {
      window.removeEventListener("resize", resize)
      stopWatching()
    }
  }, [])

  return <canvas ref={ref} className={`transition-overlay${phase === "idle" ? "" : " is-active"}`} aria-hidden="true" />
}
