// The wipe that covers the screen between pages: one bar on a black stage.
//
// Starting a transition, the bar is huge and tilted, covering the page from one diagonal; it rotates and zooms in
// until it is a small bar at the centre of the screen, which is where a loading state can live. Uncovering plays
// the same move outwards, mirrored, and the page cuts in once the bar has left the screen.

export const UNIT_MAX = 42
export const UNIT_DIVISOR = 30
export const BAR_LENGTH = 5 // in units; the bar is one unit tall
export const EDGE_FADE = .12 // the share of the cover ratio over which the overlay fades at each end, instead of a hard cut
export const DPR_MAX = 1.5

export const STAGE = "#000"
export const BAR = "#f7f5ed"
export const BAR_DIM = "#2a2a2f"

export function expoInOut(x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  return x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2
}

/** Everything the overlay needs to place the bar, from the viewport size and how covered the page is. */
export function wipeFrame(width, height, cover, phase) {
  const unit = Math.max(1, Math.floor(Math.min(UNIT_MAX, width / UNIT_DIVISOR)))
  const diagonalUnits = Math.hypot(width + 2, height + 2) / unit
  const spread = expoInOut(1 - cover) // 1: the bar spans the screen, 0: it sits at the centre at one unit tall
  return {
    unit,
    spread,
    scale: (1 + spread * diagonalUnits) * unit,
    rotation: spread * (phase === "hiding" ? -1 : 1),
    offsetX: unit * spread * diagonalUnits,
    offsetY: -unit * .5 * spread * diagonalUnits,
    opacity: Math.min(1, cover / EDGE_FADE),
  }
}

/** Draws one frame of the wipe. `progress` is how much of the bar is lit, for a loading state; 1 is the whole bar. */
export function drawWipe(ctx, { width, height, dpr, cover, phase, progress = 1 }) {
  const canvasWidth = width + 2
  const canvasHeight = height + 2
  const { scale, rotation, offsetX, offsetY } = wipeFrame(width, height, cover, phase)
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.fillStyle = STAGE
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.translate(canvasWidth * .5, canvasHeight * .5)
  ctx.rotate(rotation)
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)
  ctx.fillStyle = BAR_DIM
  ctx.fillRect(-BAR_LENGTH / 2, -.5, BAR_LENGTH, 1)
  ctx.fillStyle = BAR
  ctx.fillRect(-BAR_LENGTH / 2, -.5, BAR_LENGTH * progress, 1)
  ctx.restore()
}
