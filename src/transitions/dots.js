// The default cut: the backdrop's own dot grid swallows the page.
//
// Hiding, a wave runs out from the click: each dot of the grid swells as the wave passes until neighbours merge into
// solid stage black. Dots that have only just started growing are lit blue, so a blue ring leads the wave.
// Showing, the dots shrink back in a wave from the middle of the screen and the new page shows through the gaps.
// The overlay's dots sit exactly on the backdrop's dots, so the cut reads as the page's own surface closing.

import { clamp01, easeInOutCubic } from "./ease"

export const CELL = 30 // the backdrop's dot grid (--grid in tokens.css)
export const GRID_PARALLAX = .22 // the backdrop grid moves at this share of the scroll
export const REACH = CELL * .72 // a dot this big overlaps its diagonal neighbours, so the grid closes completely
export const WAVE = .55 // share of the cut the wave spends crossing the screen; the rest is each dot growing
export const EDGE = .4 // dots still smaller than this share of full size are drawn blue
export const DOT_TIMING = { hide: .6, show: .75 }

/** Where the wave starts and how far it has to travel to reach the farthest corner. */
export function waveOrigin(width, height, phase, origin) {
  const x = phase === "hiding" && origin ? origin.x : width / 2
  const y = phase === "hiding" && origin ? origin.y : height / 2
  const reach = Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  )
  return { x, y, reach: reach || 1 }
}

/** How big a dot is, 0 to 1 of REACH, at `n` (its distance from the wave origin over the wave's reach). */
export function dotSize(cover, phase, n) {
  const progress = easeInOutCubic(phase === "hiding" ? cover : 1 - cover)
  const local = clamp01((progress - n * WAVE) / (1 - WAVE))
  return phase === "hiding" ? local : 1 - local
}

/** How far from the origin the hiding wave has reached, in px: dots beyond it have not started to grow. */
export function waveFront(cover, wave) {
  return clamp01(easeInOutCubic(cover) / WAVE) * wave.reach
}

/** Draw one frame of the dot cut. The canvas overhangs the viewport by 1px on each side (see shell.css). */
export function drawDots(ctx, { width, height, dpr, cover, phase, origin, scrollY = 0, colors }) {
  ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr)
  ctx.globalAlpha = 1
  ctx.clearRect(-1, -1, width + 2, height + 2)
  ctx.fillStyle = colors.stage
  if (cover >= 1) {
    ctx.fillRect(-1, -1, width + 2, height + 2)
    return
  }

  const wave = waveOrigin(width, height, phase, origin)
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

  if (!lit.length) return
  ctx.fillStyle = colors.accent
  ctx.beginPath()
  for (let index = 0; index < lit.length; index += 3) {
    ctx.moveTo(lit[index] + lit[index + 2], lit[index + 1])
    ctx.arc(lit[index], lit[index + 1], lit[index + 2], 0, Math.PI * 2)
  }
  ctx.fill()
}
