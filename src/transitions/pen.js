// The bridge of the dot cut: while the pulse holds the screen, the pen draws my name in the middle of it.
//
// The same drawing as the home hero (HeroLockup), retimed to fit inside the cut and painted on the overlay canvas:
// each shape of the wordmark is stroked by a white-hot line in a blue glow, striking on like a neon tube, with its
// anchor points popping in as the pen passes, then the ink fills in. The dot cut clips it to the black of the pulse,
// so the leading edge reveals the name in halftone and the trailing edge takes it away the same way.
// Always lit, in both themes: the bridge is stage black, and on black the pen is a neon sign.

import { WORDMARK_ANCHORS, WORDMARK_PATH, WORDMARK_SHAPES } from "../brand/paths"
import { clamp01, easeInOutCubic, lerp } from "./ease"

// Seconds from the start of the cut.
export const PEN = {
  start: .1, // the first stroke
  stagger: .024, // between shapes, left to right
  draw: .3, // one shape's stroke
  anchor: .14, // one anchor's pop
  ink: .6, // the fill starts
  inkFor: .2,
}

const WORDMARK_WIDTH = 200
const WORDMARK_HEIGHT = 28
const NEON = { core: "#e6ecff", halo: "#8eabff", spill: "rgb(56 109 255)", ink: "#f7f5ed" }

// The tube catching: brightness over the first stretch of a stroke (from the hero's neon-strike keyframes).
const STRIKE = [[0, .1], [.12, 1], [.22, .25], [.3, 1], [.44, .55], [.52, 1]]
const STRIKE_FOR = .4

/** How far the pen has drawn shape `index`, 0 to 1. */
export function strokeProgress(time, index) {
  return easeInOutCubic(clamp01((time - PEN.start - index * PEN.stagger) / PEN.draw))
}

/** The stroke's brightness as it strikes on, 0 to 1. */
export function strike(time, index) {
  const t = (time - PEN.start - index * PEN.stagger) / STRIKE_FOR
  if (t <= 0) return 0
  for (let step = 1; step < STRIKE.length; step += 1) {
    const [at, value] = STRIKE[step]
    if (t < at) {
      const [from, start] = STRIKE[step - 1]
      return lerp(start, value, (t - from) / (at - from))
    }
  }
  return 1
}

/** An anchor's scale as the pen passes it: pops to 1.5 and settles at 1; 0 before then. */
export function anchorScale(time, index, step, count) {
  const at = PEN.start + index * PEN.stagger + (step / count) * PEN.draw
  const t = clamp01((time - at) / PEN.anchor)
  if (t === 0) return 0
  return t < .6 ? lerp(0, 1.5, t / .6) : lerp(1.5, 1, (t - .6) / .4)
}

export function inkOpacity(time) {
  return clamp01((time - PEN.ink) / PEN.inkFor)
}

/** Where the name sits: centred, about half the screen wide (wider on phones). */
export function penLayout(width, height) {
  const w = Math.min(width * (width < 700 ? .8 : .52), 760)
  const scale = w / WORDMARK_WIDTH
  return { x: (width - w) / 2, y: (height - WORDMARK_HEIGHT * scale) / 2, scale }
}

let paths = null
function wordmarkPaths() {
  if (!paths) {
    paths = {
      shapes: WORDMARK_SHAPES.map((shape) => ({ path: new Path2D(shape.d), length: shape.length })),
      fill: new Path2D(WORDMARK_PATH),
    }
  }
  return paths
}

// Three strokes per shape, widest first: a spill of blue light, a halo, then the white-hot core.
// shadowBlur ignores the canvas transform, so its sizes are in screen pixels (times dpr).
const PASSES = [
  { color: NEON.spill, width: .55, blur: 22, alpha: .75 },
  { color: NEON.halo, width: .4, blur: 7, alpha: .9 },
  { color: NEON.core, width: .26, blur: 1.5, alpha: 1 },
]

export function drawPen(ctx, { width, height, dpr, time }) {
  if (time <= PEN.start) return
  const { shapes, fill } = wordmarkPaths()
  const { x, y, scale } = penLayout(width, height)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.lineJoin = "round"
  ctx.lineCap = "round"

  const ink = inkOpacity(time)
  if (ink > 0) {
    ctx.globalAlpha = ink
    ctx.shadowBlur = 0
    ctx.fillStyle = NEON.ink
    ctx.fill(fill)
  }

  ctx.shadowColor = NEON.spill
  for (const pass of PASSES) {
    ctx.strokeStyle = pass.color
    ctx.lineWidth = pass.width
    ctx.shadowBlur = pass.blur * dpr
    shapes.forEach(({ path, length }, index) => {
      const drawn = strokeProgress(time, index)
      if (drawn <= 0) return
      ctx.globalAlpha = pass.alpha * strike(time, index)
      ctx.setLineDash([length, 1000])
      ctx.lineDashOffset = length * (1 - drawn)
      ctx.stroke(path)
    })
  }
  ctx.setLineDash([])

  // Anchors: little squares on the path, dark inside, lit outline.
  ctx.shadowBlur = 4 * dpr
  ctx.lineWidth = .2
  ctx.strokeStyle = NEON.core
  ctx.fillStyle = "#000"
  ctx.globalAlpha = 1
  WORDMARK_ANCHORS.forEach((points, index) => {
    points.forEach(([px, py], step) => {
      const size = 1.5 * anchorScale(time, index, step, points.length)
      if (size <= 0) return
      ctx.fillRect(px - size / 2, py - size / 2, size, size)
      ctx.strokeRect(px - size / 2, py - size / 2, size, size)
    })
  })
  ctx.restore()
}
