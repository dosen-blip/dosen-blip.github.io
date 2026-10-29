import { useEffect, useRef } from "react"
import "../styles/instinct-card.css"

const plates = {
  card: { room: "/assets/instinct/card-room.webp", sign: "/assets/instinct/card-sign.webp" },
  sheet: { room: "/assets/instinct/sheet-room.webp", sign: "/assets/instinct/sheet-sign.webp" },
}

// Fireflies over the plate: left %, top %, size px, drift period s, delay s. Blinkers are the yellow-green ones.
const flies = [
  [14, 72, 4, 11, -2, "blink"],
  [27, 34, 3, 14, -7, "orb"],
  [58, 66, 5, 12, -4, "orb"],
  [71, 28, 3, 9, -1, "blink"],
  [84, 58, 4, 13, -9, "blink"],
  [43, 82, 3, 10, -5, "orb"],
]

/**
 * The Instinct Groove wall as card art, baked from the live scene: the room, and the sign's light on its own layer over
 * it, so the lamp behind the letters can hum and stutter on hover the way it does in the scene. Pointing at the card
 * tilts the room against the fireflies in front of it. `variant`: "card" (project cards) or "sheet" (the glass folder).
 */
export function InstinctCardArt({ variant = "card" }) {
  const ref = useRef(null)
  const plate = plates[variant]

  useEffect(() => {
    const art = ref.current
    const target = art?.closest("a, button, [role='button'], .gf-sheet") ?? art?.parentElement
    if (!art || !target) return undefined
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return undefined

    let frame = 0
    let x = 0
    let y = 0
    const apply = () => {
      frame = 0
      art.style.setProperty("--ig-tx", x.toFixed(3))
      art.style.setProperty("--ig-ty", y.toFixed(3))
    }
    const onMove = (event) => {
      const rect = target.getBoundingClientRect()
      x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1))
      y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
      if (!frame) frame = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      x = 0
      y = 0
      if (!frame) frame = requestAnimationFrame(apply)
    }
    target.addEventListener("pointermove", onMove, { passive: true })
    target.addEventListener("pointerleave", onLeave)
    return () => {
      target.removeEventListener("pointermove", onMove)
      target.removeEventListener("pointerleave", onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <span ref={ref} className={`ig-card-art ig-card-art--${variant}`} aria-hidden="true">
      <span className="ig-card-wall">
        <img className="ig-card-layer ig-card-room" src={plate.room} alt="" loading="lazy" decoding="async" draggable={false} />
        <img className="ig-card-layer ig-card-sign" src={plate.sign} alt="" loading="lazy" decoding="async" draggable={false} />
        <img className="ig-card-layer ig-card-bloom" src={plate.sign} alt="" loading="lazy" decoding="async" draggable={false} />
      </span>
      <span className="ig-card-flies">
        {flies.map(([left, top, size, period, delay, kind]) => (
          <i
            key={`${left}-${top}`}
            className={`ig-card-fly ig-card-fly--${kind}`}
            style={{ left: `${left}%`, top: `${top}%`, "--ig-fly-size": `${size}px`, "--ig-fly-period": `${period}s`, "--ig-fly-delay": `${delay}s` }}
          />
        ))}
      </span>
    </span>
  )
}
