import { useEffect, useRef } from "react"
import { transition } from "../transitions/transitionStore"
import { useTransitionPhase } from "../transitions/useTransitionPhase"
import { cutTime, drawDots } from "../transitions/dots"
import { drawPen } from "../transitions/pen"
import { centreRect, clipRect, drawSelection, findTargetElement, measureTarget, selectionFrame } from "../transitions/frame"

const DPR_MAX = 1.5

/** The brand colours the cuts draw with, read when a cut starts so they follow the theme. */
function readColors() {
  const style = getComputedStyle(document.documentElement)
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback
  const neonOn = Number(read("--neon-on", "0")) > 0
  return {
    stage: read("--stage", "#0c0c0f"),
    accent: read("--accent", "#386dff"),
    line: read("--neon-core", "#386dff"),
    handle: read("--bg", "#f7f5ed"),
    label: read("--accent-strong", "#2b5ce6"),
    labelText: read("--on-accent", "#fff"),
    mono: read("--font-mono", "monospace"),
    glow: neonOn ? `rgb(${read("--neon-rgb", "92 136 255")} / .85)` : null,
  }
}

/**
 * The canvas that covers the page between routes. It draws one of two cuts, chosen per navigation:
 * the dot grid pulse (transitions/dots.js) with the pen drawing my name in its bridge (transitions/pen.js) by
 * default, or the selection box filled with the card's picture (transitions/frame.js) when the click came from a
 * project card or folder sheet. It only shows while a transition runs and is drawn straight from
 * the store's frame loop, so nothing re-renders in React per frame.
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
    let colors = null
    let from = null
    let target = null // the new page's hero element, found under the cover

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1)
      canvas.width = Math.round((width + 2) * dpr)
      canvas.height = Math.round((height + 2) * dpr)
      canvas.style.width = `${width + 2}px`
      canvas.style.height = `${height + 2}px`
    }
    const start = () => {
      colors = readColors()
      const rect = transition.options.origin?.rect
      from = (rect && clipRect(rect, width, height)) || centreRect(width, height)
      target = null
    }
    // Under the cover the new page is on screen and scrolled to the top: find what the frame will land on.
    const measure = () => {
      if (transition.options.style === "frame") target = findTargetElement(document, width, height)
    }
    const draw = () => {
      if (!transition.active) return
      if (!colors) start()
      const { cover, phase, options } = transition
      if (options.style === "frame") {
        const landing = (phase === "showing" && target && measureTarget(target, width, height)) || centreRect(width, height)
        const frame = selectionFrame(phase, cover, { from, target: landing, width, height })
        drawSelection(ctx, { width, height, dpr, frame, colors, media: options.origin?.media, phase, cover })
      } else {
        const time = cutTime(cover, phase, options)
        const bridge = (context) => drawPen(context, { width, height, dpr, time })
        drawDots(ctx, { width, height, dpr, cover, phase, origin: options.origin, scrollY: window.scrollY, colors, bridge })
      }
    }

    resize()
    window.addEventListener("resize", resize)
    const stops = [
      transition.on("hidestart", start),
      transition.on("swap", measure),
      transition.watchFrames(draw),
    ]
    return () => {
      window.removeEventListener("resize", resize)
      stops.forEach((stop) => stop())
    }
  }, [])

  return <canvas ref={ref} className={`transition-overlay${phase === "idle" ? "" : " is-active"}`} aria-hidden="true" />
}
