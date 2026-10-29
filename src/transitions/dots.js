// The default cut: a pulse runs through the backdrop's own dot grid.
//
// One ring travels out from the click. Its leading edge swells each dot of the grid until neighbours merge into stage
// black; its trailing edge, a moment behind, shrinks them away again with the new page already underneath. Both
// edges are lit blue (dots that are still small), so the cut reads as a blue-rimmed band of black sweeping across the
// screen rather than a fade to black and back. The screen is completely covered only from the moment the leading edge
// reaches the farthest corner (when the content swaps) until the trailing edge leaves the click, a short `hold` in
// which the pen draws my name across the middle (pen.js). The name is clipped to the black, so the edges halftone it.
// The overlay's dots sit exactly on the backdrop's dots, so the cut reads as the page's own surface rippling.

import { clamp01, easeInOutCubic } from "./ease"

export const CELL = 30 // the backdrop's dot grid (--grid in tokens.css)
export const GRID_PARALLAX = .22 // the backdrop grid moves at this share of the scroll
export const REACH = CELL * .72 // a dot this big overlaps its diagonal neighbours, so the grid closes completely
export const EDGE = .4 // dots smaller than this share of full size are drawn blue: the pulse's two rims

// Seconds. `close` and `open`: how long each edge of the pulse takes to cross the screen. `grow` and `shrink`: how
// long one dot takes to fill or empty as an edge passes. `hold`: how long the screen stays covered after the swap,
// the bridge the pen draws in. The black any one spot sees lasts about `close` + `hold`.
export const PULSE = { close: .3, grow: .18, hold: .26, open: .36, shrink: .2 }
export const DOT_TIMING = { hide: PULSE.close + PULSE.grow, show: PULSE.hold + PULSE.open + PULSE.shrink, uncoverAt: PULSE.hold }

/** Seconds since the cut started, from where the cover is (with the durations it is running at). */
export function cutTime(cover, phase, timing = DOT_TIMING) {
  return phase === "hiding" ? cover * timing.hide : timing.hide + (1 - cover) * timing.show
}

/** Where the pulse starts (the click, or the middle of the screen) and how far it has to travel to the farthest corner. */
export function waveOrigin(width, height, origin) {
  const x = origin ? origin.x : width / 2
  const y = origin ? origin.y : height / 2
  const reach = Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  )
  return { x, y, reach: reach || 1 }
}

/** How big a dot is, 0 to 1 of REACH, at `n` (its distance from the pulse origin over the pulse's reach). */
export function dotSize(cover, phase, n) {
  if (phase === "hiding") {
    const time = cover * DOT_TIMING.hide
    return easeInOutCubic(clamp01((time - n * PULSE.close) / PULSE.grow))
  }
  const time = (1 - cover) * DOT_TIMING.show - PULSE.hold
  return 1 - easeInOutCubic(clamp01((time - n * PULSE.open) / PULSE.shrink))
}

/** How far from the origin the pulse's leading edge has reached, in px: dots beyond it have not started to grow. */
export function waveFront(cover, wave) {
  return clamp01(cover * DOT_TIMING.hide / PULSE.close) * wave.reach
}

/**
 * Draw one frame of the dot cut. The canvas overhangs the viewport by 1px on each side (see shell.css).
 * `bridge(ctx)`, if given, draws what shows inside the black (the pen), clipped to it.
 */
export function drawDots(ctx, { width, height, dpr, cover, phase, origin, scrollY = 0, colors, bridge }) {
  ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr)
  ctx.globalAlpha = 1
  ctx.clearRect(-1, -1, width + 2, height + 2)
  ctx.fillStyle = colors.stage
  if (cover >= 1) {
    ctx.fillRect(-1, -1, width + 2, height + 2)
    bridge?.(ctx)
    return
  }

  const wave = waveOrigin(width, height, origin)
  // Rows line up with the backdrop's dots, which sit at 15px into each cell and drift up with the scroll.
  const shift = CELL / 2 - ((scrollY * GRID_PARALLAX) % CELL)
  const columns = Math.ceil(width / CELL) + 1
  const rows = Math.ceil(height / CELL) + 2
  const lit = []

  ctx.beginPath()
  for (let row = -1; row < rows; row += 1) {
    const y = shift + row * CELL
    for (let column = 0; column < columns; column += 1) {
      const x = CELL / 2 + column * CELL
      const size = dotSize(cover, phase, Math.hypot(x - wave.x, y - wave.y) / wave.reach)
      if (size <= 0) continue
      if (size < EDGE) {
        lit.push(x, y, size * REACH)
        continue
      }
      const radius = size * REACH
      ctx.moveTo(x + radius, y)
      ctx.arc(x, y, radius, 0, Math.PI * 2)
    }
  }
  ctx.fill()
  if (bridge) {
    ctx.save()
    ctx.clip()
    bridge(ctx)
    ctx.restore()
  }

  if (!lit.length) return
  ctx.fillStyle = colors.accent
  ctx.beginPath()
  for (let index = 0; index < lit.length; index += 3) {
    ctx.moveTo(lit[index] + lit[index + 2], lit[index + 1])
    ctx.arc(lit[index], lit[index + 1], lit[index + 2], 0, Math.PI * 2)
  }
  ctx.fill()
}
