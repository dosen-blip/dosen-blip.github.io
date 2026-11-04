// The default cut: a pulse runs through a fine dot grid laid over the backdrop's own.
//
// One ring travels out from the click. Its leading edge swells the dots until neighbours merge into stage black. Its
// trailing edge does the reverse with holes: each dot of the black opens as a window onto the new page, already live
// underneath, starting as a blue dot and growing until the windows merge. So the page forms out of the dots as the
// pulse passes, and the cut reads as a blue-rimmed band of black sweeping across the screen rather than a fade to
// black and back. The screen is completely covered for just a moment, when the leading edge reaches the farthest corner
// and the content swaps; the trailing edge sets off from the click at once.
// Every second dot of the overlay sits exactly on a backdrop dot, so the cut reads as the page's own surface rippling.

import { clamp01, easeInOutCubic } from "./ease"

export const CELL = 30 // the backdrop's dot grid (--grid in tokens.css)
export const GRID_PARALLAX = .22 // the backdrop grid moves at this share of the scroll
export const DOT = CELL / 2 // the overlay's grid, twice as fine as the backdrop's
export const REACH = DOT * .72 // a dot this big overlaps its diagonal neighbours, so the grid closes completely
export const EDGE = .4 // dots and holes smaller than this share of full size are drawn blue: the pulse's two rims
const SOLID = .12 // a hole is a solid blue dot up to this size, then opens from the middle until only the page is left

// The light inside the wave's black, the same as around a lit backdrop tool (.backdrop-tool in shell.css): a faint wash
// of neon, and the backdrop's own tiny grid dots lit up in it with a 5px halo.
export const BAND_GLOW = { wash: .16, dot: 1.1, halo: 5 }

// Seconds. `close` and `open`: how long each edge of the pulse takes to cross the screen. `grow` and `shrink`: how
// long one dot takes to fill or one hole to open as an edge passes. The black any one spot sees lasts about `close`.
export const PULSE = { close: .3, grow: .18, open: .36, shrink: .2 }
export const DOT_TIMING = { hide: PULSE.close + PULSE.grow, show: PULSE.open + PULSE.shrink, uncoverAt: 0 }

// The same pulse as one wave, for browsers that can keep a snapshot of the old page (snapshot.js): the old page stays up
// ahead of the leading edge and the new one is already there behind the trailing edge, so nothing ever has to be fully
// covered. Seconds. `travel`: how long the leading edge takes to cross the screen. `grow`, `shrink`: one dot filling,
// one hole opening. `gap`: how long a spot stays solid black in between. The line between the two pages runs down the
// middle of that solid band, and `gap` must keep the band wide enough to hide it on the smallest screen.
export const WAVE = { travel: .46, grow: .08, gap: .04, shrink: .14 }
export const WAVE_TIMING = { wave: true, hide: 0, show: WAVE.travel + WAVE.grow + WAVE.gap + WAVE.shrink, uncoverAt: 0 }

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

/**
 * How big a dot of the black is, 0 to 1 of REACH, at `n` (its distance from the pulse origin over the pulse's reach).
 * While showing, the hole opening there is the rest of it: 1 minus this.
 */
export function dotSize(cover, phase, n) {
  if (phase === "hiding") {
    const time = cover * DOT_TIMING.hide
    return easeInOutCubic(clamp01((time - n * PULSE.close) / PULSE.grow))
  }
  const time = (1 - cover) * DOT_TIMING.show
  return 1 - easeInOutCubic(clamp01((time - n * PULSE.open) / PULSE.shrink))
}

/** How far from the origin the pulse's leading edge has reached, in px: dots beyond it have not started to grow. */
export function waveFront(cover, wave) {
  return clamp01(cover * DOT_TIMING.hide / PULSE.close) * wave.reach
}

/** How filled a dot of the wave is, 0 to 1, `time` seconds into the cut, at `n` (as in dotSize). */
export function waveDotSize(time, n) {
  return easeInOutCubic(clamp01((time - n * WAVE.travel) / WAVE.grow))
}

/** How open the wave's hole is, 0 to 1, `time` seconds into the cut, at `n`. */
export function waveHoleSize(time, n) {
  return easeInOutCubic(clamp01((time - n * WAVE.travel - WAVE.grow - WAVE.gap) / WAVE.shrink))
}

/** How far the new page reaches from the origin, in px: down the middle of the wave's solid band. */
export function revealRadius(cover, wave) {
  const time = (1 - cover) * WAVE_TIMING.show
  return Math.max(0, (time - WAVE.grow - WAVE.gap / 2) / WAVE.travel) * wave.reach
}

/**
 * Visit every dot of the grid: x, y, n, and whether it is also a dot of the backdrop's coarser grid (every second one).
 * Rows line up with the backdrop's dots, which drift up with the scroll.
 */
function eachDot(width, height, scrollY, wave, visit) {
  const shift = CELL / 2 - ((scrollY * GRID_PARALLAX) % CELL)
  const columns = Math.ceil(width / DOT) + 2
  const rows = Math.ceil(height / DOT) + 3
  for (let row = -1; row < rows; row += 1) {
    const y = shift + row * DOT
    for (let column = -1; column < columns; column += 1) {
      const x = CELL / 2 + column * DOT
      // Some of the grid overhangs the screen, hence the min.
      visit(x, y, Math.min(1, Math.hypot(x - wave.x, y - wave.y) / wave.reach), (column & 1) === 0 && (row & 1) === 0)
    }
  }
}

/** Fill discs, a flat list of x, y, radius, as one path. */
function fillDiscs(ctx, discs) {
  ctx.beginPath()
  for (let index = 0; index < discs.length; index += 3) {
    ctx.moveTo(discs[index] + discs[index + 2], discs[index + 1])
    ctx.arc(discs[index], discs[index + 1], discs[index + 2], 0, Math.PI * 2)
  }
  ctx.fill()
}

/** The leading edge: black dots swelling over the old page, the smallest lit blue. */
function drawClosing(ctx, { cover, phase, wave, width, height, scrollY, colors }) {
  const black = []
  const lit = []
  eachDot(width, height, scrollY, wave, (x, y, n) => {
    const size = dotSize(cover, phase, n)
    if (size > 0) (size < EDGE ? lit : black).push(x, y, size * REACH)
  })
  fillDiscs(ctx, black)
  ctx.fillStyle = colors.accent
  fillDiscs(ctx, lit)
}

/** The trailing edge: solid black with holes through it onto the new page. */
function drawOpening(ctx, { cover, phase, wave, width, height, scrollY, colors }) {
  ctx.fillRect(-1, -1, width + 2, height + 2)
  const holes = []
  const lit = []
  eachDot(width, height, scrollY, wave, (x, y, n) => {
    const size = 1 - dotSize(cover, phase, n)
    if (size <= 0) return
    pushHole(holes, lit, x, y, size)
  })
  punchHoles(ctx, holes, lit, colors)
}

/** A hole of `size`: wide open, or still a blue dot opening from the middle. */
function pushHole(holes, lit, x, y, size) {
  const radius = size * REACH
  if (size >= EDGE) {
    holes.push(x, y, radius)
    return
  }
  lit.push(x, y, radius)
  if (size > SOLID) holes.push(x, y, radius * (size - SOLID) / (EDGE - SOLID))
}

function punchHoles(ctx, holes, lit, colors) {
  ctx.fillStyle = colors.accent
  fillDiscs(ctx, lit)
  ctx.globalCompositeOperation = "destination-out"
  fillDiscs(ctx, holes)
  ctx.globalCompositeOperation = "source-over"
}

/**
 * Draw one frame of the wave: dots swelling over the old page's snapshot ahead, holes opening onto the new page behind.
 * Only the band itself is drawn, with a soft light inside its black.
 */
export function drawWave(ctx, { width, height, dpr, cover, origin, scrollY = 0, colors }) {
  ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr)
  ctx.globalAlpha = 1
  ctx.clearRect(-1, -1, width + 2, height + 2)
  const wave = waveOrigin(width, height, origin)
  const time = (1 - cover) * WAVE_TIMING.show
  const touching = (2 * REACH) / wave.reach // a neighbour this much farther out can still reach into this dot's hole
  const black = []
  const leading = []
  const holes = []
  const trailing = []
  const lit = []
  eachDot(width, height, scrollY, wave, (x, y, n, onBackdrop) => {
    const size = waveDotSize(time, n)
    if (size <= 0) return
    const hole = waveHoleSize(time, n)
    if (hole >= 1 && waveHoleSize(time, Math.min(1, n + touching)) >= 1) return // long gone, and so are its neighbours
    if (hole < 1) (size < EDGE ? leading : black).push(x, y, size * REACH)
    if (hole > 0) pushHole(holes, trailing, x, y, hole)
    if (onBackdrop && hole < 1) lit.push(x, y, BAND_GLOW.dot)
  })
  ctx.fillStyle = colors.stage
  fillDiscs(ctx, black)
  drawBandGlow(ctx, { wave, time, width, height, dpr, lit, colors })
  ctx.fillStyle = colors.accent
  fillDiscs(ctx, leading)
  punchHoles(ctx, holes, trailing, colors)
}

/** How bright the band's light is across its width, as a fill: dark at both edges, `peak` through the solid middle. */
function bandLight(ctx, wave, time, peak, colors) {
  const outer = (time / WAVE.travel) * wave.reach
  const inner = Math.max(0, ((time - WAVE.grow - WAVE.gap - WAVE.shrink) / WAVE.travel) * wave.reach)
  if (outer <= inner) return null
  const light = ctx.createRadialGradient(wave.x, wave.y, inner, wave.x, wave.y, outer)
  const middle = Math.min(1, Math.max(0, (((time - WAVE.grow - WAVE.gap / 2) / WAVE.travel) * wave.reach - inner) / (outer - inner)))
  light.addColorStop(0, `rgb(${colors.neon} / 0)`)
  light.addColorStop(middle, `rgb(${colors.neon} / ${peak})`)
  light.addColorStop(1, `rgb(${colors.neon} / 0)`)
  return light
}

/** The soft light, painted only on the black that is already there, so it never reaches either page. */
function drawBandGlow(ctx, { wave, time, width, height, dpr, lit, colors }) {
  const wash = bandLight(ctx, wave, time, BAND_GLOW.wash, colors)
  if (!wash) return
  ctx.globalCompositeOperation = "source-atop"
  ctx.fillStyle = wash
  ctx.fillRect(-1, -1, width + 2, height + 2)
  ctx.fillStyle = bandLight(ctx, wave, time, 1, colors)
  ctx.shadowColor = `rgb(${colors.neon})`
  ctx.shadowBlur = BAND_GLOW.halo * dpr // shadows ignore the canvas transform
  fillDiscs(ctx, lit)
  ctx.shadowBlur = 0
  ctx.globalCompositeOperation = "source-over"
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
  const frame = { cover, phase, wave: waveOrigin(width, height, origin), width, height, scrollY, colors }
  if (phase === "showing") drawOpening(ctx, frame)
  else drawClosing(ctx, frame)
}
