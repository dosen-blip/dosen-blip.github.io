import { useEffect, useRef } from "react"
import "../styles/fs-card.css"

const dir = "/assets/frequency-shift/card/"
const plates = (name) => ({
  base: `${dir}${name}-base.webp`,
  sign: `${dir}${name}-sign.webp`,
  still: `${dir}${name}-show.webp`,
  show: `${dir}${name}-show.mp4`,
})
const variants = { card: plates("card"), sheet: plates("sheet") }

/**
 * The Frequency Shift laser room as card art, baked from the site's own scene (src/scenes/laser-room, `npm run
 * bake:fs`): the bare room, the sign's light on a layer of its own, and everything that moves as a short video of what
 * it adds to the room: the beams, the smoke they and the sign light, the fog bank rolling along the floor, looping
 * without a seam. All of it is added back together (plus-lighter). The show plays while the card is on the screen;
 * pointed at, the sign stutters through a power-on and the room tilts against the pointer. With reduced motion, the
 * show holds still. `variant`: "card" (project cards: the site's whole lockup under the fan and the twin sheets) or
 * "sheet" (the glass folder: the monogram, high, in the ceiling's rain of light).
 */
export function FrequencyShiftCardArt({ variant = "card" }) {
  const ref = useRef(null)
  const showRef = useRef(null)
  const plate = variants[variant]

  // the show: loaded once the card first comes near the screen, played while it's on it
  useEffect(() => {
    const art = ref.current
    const video = showRef.current
    if (!art || !video || typeof IntersectionObserver === "undefined") return undefined
    if (!window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) return undefined
    const onPlaying = () => art.classList.add("is-playing")
    video.addEventListener("playing", onPlaying)
    const watcher = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!video.getAttribute("src")) video.src = plate.show
        video.play().catch(() => {})
      } else video.pause()
    }, { rootMargin: "120px" })
    watcher.observe(art)
    return () => {
      watcher.disconnect()
      video.removeEventListener("playing", onPlaying)
      video.pause()
    }
  }, [plate.show])

  // the room tilts against the pointer
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
      art.style.setProperty("--fsc-tx", x.toFixed(3))
      art.style.setProperty("--fsc-ty", y.toFixed(3))
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

  const layer = (className, src) => (
    <img className={`fsc-layer ${className}`} src={src} alt="" loading="lazy" decoding="async" draggable={false} />
  )

  return (
    <span ref={ref} className={`fsc-art fsc-art--${variant}`} aria-hidden="true">
      <span className="fsc-room">
        {layer("fsc-base", plate.base)}
        <span className="fsc-show">
          {layer("fsc-show-still", plate.still)}
          <video ref={showRef} className="fsc-layer fsc-show-video" muted loop playsInline preload="none" disablePictureInPicture tabIndex={-1} />
        </span>
        {layer("fsc-sign", plate.sign)}
        {layer("fsc-bloom", plate.sign)}
      </span>
    </span>
  )
}
