import { useEffect, useRef } from "react"
import { cursorHeat, onCursorHeat } from "../utils/cursorHeat"

const FRAME_HOSTS = ".project-card, .about-portrait, .hero-lockup"
const FRAME_REACH = 26 // px from a selection frame's edge where the dot starts to pick up its blue

// Distance from the pointer to a rectangle's outline, inside or out.
function edgeDistance(rect, x, y) {
  const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  if (inside) return Math.min(x - rect.left, rect.right - x, y - rect.top, rect.bottom - y)
  return Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom))
}

function frameHeat(target, x, y) {
  const frame = target?.closest(FRAME_HOSTS)?.querySelector(".selection-handles, .selection-frame")
  if (!frame || Number(getComputedStyle(frame).opacity) < .5) return 0
  return Math.max(0, 1 - edgeDistance(frame.getBoundingClientRect(), x, y) / FRAME_REACH)
}

/**
 * Dark mode's pointer: a small white LED dot in place of the system cursor.
 * It turns blue as it touches anything else that glows (a lit tool in the backdrop, a selection frame).
 * Mouse and trackpad only; touch keeps its own behaviour, and light mode keeps the normal cursor.
 */
export function NeonCursor() {
  const ref = useRef(null)

  useEffect(() => {
    const dot = ref.current
    if (!dot || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined
    const root = document.documentElement
    root.classList.add("has-neon-cursor")
    let frame = 0
    let pointer = null

    const render = () => {
      frame = 0
      if (!pointer) return
      const [x, y] = pointer
      const target = document.elementFromPoint(x, y)
      const typing = target?.closest("input, textarea, select, [contenteditable='true']")
      dot.style.translate = `${x}px ${y}px`
      dot.style.setProperty("--heat", Math.max(cursorHeat(), frameHeat(target, x, y)).toFixed(3))
      dot.classList.toggle("is-hidden", Boolean(typing))
      dot.classList.toggle("is-over-link", !typing && Boolean(target?.closest("a, button, label, summary, [role='button'], [role='switch']")))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render) }
    const onMove = (event) => {
      if (event.pointerType === "touch") return
      pointer = [event.clientX, event.clientY]
      schedule()
    }
    const onLeave = () => { pointer = null; dot.classList.add("is-hidden") }
    const onDown = () => dot.classList.add("is-down")
    const onUp = () => dot.classList.remove("is-down")

    const stopHeat = onCursorHeat(schedule)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    root.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      stopHeat()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      root.removeEventListener("pointerleave", onLeave)
      root.classList.remove("has-neon-cursor")
    }
  }, [])

  return <span ref={ref} className="neon-cursor is-hidden" aria-hidden="true" />
}
