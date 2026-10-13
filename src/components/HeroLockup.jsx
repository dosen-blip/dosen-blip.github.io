import { useEffect, useRef, useState } from "react"
import { WORDMARK_ANCHORS, WORDMARK_SHAPES } from "../brand/paths"
import { DESCRIPTOR } from "../data/site"
import { mountedAfterHydration } from "../utils/hydration"

const DRAW_START = 150
const DRAW_STAGGER = 55
const DRAW_LENGTH = 700

/**
 * Dark mode's LED light for the pen, in wordmark units so it scales with the art.
 * Three blurs of the line, each tinted blue and boosted (a thin line blurs to almost nothing):
 * a tight tube around the white-hot core, a halo, and a wide spill of light, with the line itself on top.
 */
function NeonFilter({ id, tube, halo, spill }) {
  const layers = [["tube", .3, tube], ["halo", 1.1, halo], ["spill", 3.4, spill]]
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x="-20" y="-20" width="244" height="72" colorInterpolationFilters="sRGB">
      <feFlood className="neon-flood" result="blue" />
      {layers.map(([name, blur, gain]) => [
        <feGaussianBlur key={`${name}-blur`} in="SourceAlpha" stdDeviation={blur} />,
        <feComponentTransfer key={`${name}-gain`} result={`${name}-alpha`}><feFuncA type="linear" slope={gain} /></feComponentTransfer>,
        <feComposite key={name} in="blue" in2={`${name}-alpha`} operator="in" result={name} />,
      ])}
      <feMerge>
        <feMergeNode in="spill" />
        <feMergeNode in="halo" />
        <feMergeNode in="tube" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}

/**
 * The full-size lockup: my name, then the line under it.
 * On every page load (html[data-intro]) and on every return to home within the app, the pen draws
 * each shape of the wordmark, dropping anchors as it goes, then the ink fills in and the selection box snaps on.
 * The server markup is the finished lockup, so nothing is hidden without JavaScript or with reduced motion.
 */
export function HeroLockup() {
  const [play] = useState(mountedAfterHydration)
  const [size, setSize] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0]
      setSize(box ? [Math.round(box.inlineSize), Math.round(box.blockSize)] : null)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`hero-lockup${play ? " is-playing" : ""}`}>
      <h1 className="hero-name">
        <span className="sr-only">Matia Dosen</span>
        <svg className="hero-wordmark" viewBox="-2 -2 204 32" aria-hidden="true" focusable="false">
          <defs>
            <NeonFilter id="hero-neon" tube={2.6} halo={4.5} spill={7} />
            <NeonFilter id="hero-neon-anchor" tube={.8} halo={1.4} spill={2.2} />
          </defs>
          <use className="hero-fill" href="#md-wordmark" width="200" height="28" />
          <g className="hero-pen">
            {WORDMARK_SHAPES.map((shape, index) => (
              <path
                key={shape.x}
                d={shape.d}
                style={{ "--len": shape.length, "--delay": `${DRAW_START + index * DRAW_STAGGER}ms` }}
              />
            ))}
          </g>
          <g className="hero-anchors">
            {WORDMARK_ANCHORS.flatMap((points, index) => points.map(([x, y], step) => (
              <rect
                key={`${index}-${step}`}
                x={x - .75}
                y={y - .75}
                width="1.5"
                height="1.5"
                style={{ "--delay": `${Math.round(DRAW_START + index * DRAW_STAGGER + (step / points.length) * DRAW_LENGTH)}ms` }}
              />
            )))}
          </g>
        </svg>
      </h1>
      <p className="descriptor hero-descriptor">{DESCRIPTOR}.</p>
      <span className="selection-frame" aria-hidden="true">
        <i /><i /><i /><i />
        {size && <span className="selection-size">{size[0]} × {size[1]}</span>}
      </span>
    </div>
  )
}
