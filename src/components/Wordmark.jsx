import { useEffect, useRef } from "react"
import { MD_PATH, WORDMARK_PATH } from "../brand/paths"

/** Shared vector art, defined once per document and drawn with <use>. */
export function BrandSprite() {
  return (
    <svg className="brand-sprite" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="md-wordmark" viewBox="0 0 200 28">
          <path d={WORDMARK_PATH} fillRule="evenodd" />
        </symbol>
        <symbol id="md-mark" viewBox="0 0 64 38">
          <path d={MD_PATH} fillRule="evenodd" />
        </symbol>
      </defs>
    </svg>
  )
}

// Letter positions across the 200-unit wordmark, used to set the code characters over each letter.
const letters = [
  [0, 28.7], [30.3, 50.5], [50.9, 62.6], [64.7, 70.8], [71.8, 92.4],
  [100.9, 121.3], [123.2, 143.7], [144.7, 160.3], [161.7, 181], [182.7, 200],
]
const codeGlyphs = "</>{}[]=;&#$%*+01"
const seedCode = "</{=}&;[#>"

function DecodeLayer() {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    const spans = [...node.children]
    const timer = window.setInterval(() => {
      spans.forEach((span) => { span.textContent = codeGlyphs[Math.floor(Math.random() * codeGlyphs.length)] })
    }, 55)
    const stop = window.setTimeout(() => window.clearInterval(timer), 1100)
    return () => { window.clearInterval(timer); window.clearTimeout(stop) }
  }, [])
  return (
    <span ref={ref} className="wm-code" aria-hidden="true">
      {letters.map(([from, to], index) => (
        <span key={from} style={{ left: `${from / 2}%`, width: `${(to - from) / 2}%` }}>{seedCode[index]}</span>
      ))}
    </span>
  )
}

/**
 * The matia dosen wordmark. `splash` plays the small reveal for the kind of work on the page:
 * "motion" draws it with the pen, "web" decodes it from code, "ux" reflows it from two lines to one.
 * The art is split at the word space so "dosen" can move on its own.
 */
export function Wordmark({ splash = null, className = "", label = "matia dosen" }) {
  return (
    <span className={`wordmark ${className}`.trim()} data-splash={splash || undefined} role="img" aria-label={label}>
      <span className="wm-art" aria-hidden="true">
        <svg className="wm-piece wm-matia" viewBox="0 0 96 28" focusable="false"><use href="#md-wordmark" width="200" height="28" /></svg>
        <svg className="wm-piece wm-dosen" viewBox="96 0 104 28" focusable="false"><use href="#md-wordmark" width="200" height="28" /></svg>
      </span>
      {splash === "ux" && <span className="wm-frame" aria-hidden="true" />}
      {splash === "web" && <DecodeLayer />}
    </span>
  )
}

export function MDMark({ className = "", label = "MD" }) {
  return (
    <svg className={`md-mark ${className}`.trim()} viewBox="0 0 64 38" role="img" aria-label={label} focusable="false">
      <use href="#md-mark" width="64" height="38" />
    </svg>
  )
}
