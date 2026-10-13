import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon } from "./Icons"

function FullscreenIcon() {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}

const pad = (n) => String(n).padStart(2, "0")

/**
 * A presentation, slide by slide: arrows, keyboard, swipe, thumbnails and full screen,
 * with the original PDF one click away. Slides are images, so it works the same on phones,
 * where an embedded PDF would not render at all.
 */
export function SlideDeck({ deck, label, note }) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const rootRef = useRef(null)
  const stripRef = useRef(null)
  const swipe = useRef(null)
  const count = deck.slides.length
  const slide = deck.slides[index]

  const go = useCallback((next) => setIndex(() => Math.max(0, Math.min(count - 1, next))), [count])

  // Keep the current thumbnail in view without moving the page.
  useEffect(() => {
    const strip = stripRef.current
    const thumb = strip?.children[index]
    if (!strip || !thumb) return
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2
    strip.scrollTo?.({ left, behavior: "smooth" })
  }, [index])

  // Warm the neighbours so the next click is instant.
  useEffect(() => {
    for (const offset of [1, -1]) {
      const next = deck.slides[index + offset]
      if (next) new Image().src = next.src
    }
  }, [deck.slides, index])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  function onKeyDown(event) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1) }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1) }
    if (event.key === "Home") { event.preventDefault(); go(0) }
    if (event.key === "End") { event.preventDefault(); go(count - 1) }
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse") return
    swipe.current = { x: event.clientX, y: event.clientY }
  }
  function onPointerUp(event) {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) go(index + (dx < 0 ? 1 : -1))
  }

  function toggleFullscreen() {
    const node = rootRef.current
    if (!node?.requestFullscreen) return
    if (document.fullscreenElement) document.exitFullscreen()
    else node.requestFullscreen().catch(() => {})
  }

  return (
    <section
      ref={rootRef}
      className={`deck${fullscreen ? " is-fullscreen" : ""}`}
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <div className="deck-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <img
          key={slide.src}
          className="deck-slide"
          src={slide.src}
          alt={slide.alt}
          width="1920"
          height="1080"
          decoding="async"
          loading={index === 0 ? "lazy" : "eager"}
          aria-roledescription="slide"
        />
        <button className="deck-nav deck-nav--prev" type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
          <ArrowLeftIcon />
        </button>
        <button className="deck-nav deck-nav--next" type="button" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Next slide">
          <ArrowRightIcon />
        </button>
      </div>

      <div className="deck-bar">
        <span className="deck-count" aria-live="polite">
          <span className="sr-only">Slide </span>{pad(index + 1)}<span aria-hidden="true"> / </span><span className="sr-only"> of </span>{pad(count)}
        </span>
        <div className="deck-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / count) * 100}%` }} /></div>
        <button className="deck-tool" type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>
          <FullscreenIcon /><span>{fullscreen ? "Exit full screen" : "Full screen"}</span>
        </button>
        <a className="deck-tool" href={deck.pdf} target="_blank" rel="noreferrer">
          <ArrowUpRightIcon /><span>PDF</span>
        </a>
      </div>

      <div ref={stripRef} className="deck-strip" role="group" aria-label="All slides">
        {deck.slides.map((item, slideIndex) => (
          <button
            key={item.src}
            type="button"
            className="deck-thumb"
            onClick={() => go(slideIndex)}
            aria-label={`Slide ${slideIndex + 1}`}
            aria-current={slideIndex === index ? "true" : undefined}
          >
            <img src={item.thumb} alt="" width="384" height="216" loading="lazy" decoding="async" />
            <span aria-hidden="true">{pad(slideIndex + 1)}</span>
          </button>
        ))}
      </div>

      {note && <p className="deck-note">{note}</p>}
    </section>
  )
}
