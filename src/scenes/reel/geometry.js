// The reel's shape, free of WebGL so it can be tested. One row of films runs round the inside of a cylinder: the centre
// faces you flat, the ends bend toward you and swell. Lengths are CSS pixels, measured along the cylinder's surface, so
// a film's position `s` is `angle * radius`. `y` points up, and x and y are from the centre of the frame.

// Camera distance from the screen, as a multiple of the radius. Just past the axis, so the ends come up to the lens.
export const CAMERA = 1.6

// How far round the row has bent by the frame's edge, in radians.
export const BEND = (80 * Math.PI) / 180

// Past this angle a point has nowhere sensible to project to, so the shader holds it here, well outside the frame.
export const MAX_ANGLE = (110 * Math.PI) / 180

// A film at the frame's edge is this many times its size at the centre (1 / the scale `project` gives at BEND).
const EDGE_SWELL = CAMERA / (CAMERA - 1 + Math.cos(BEND))

// A landscape film is never wider than this share of the frame, so a phone still shows its neighbours.
const MAX_WIDTH_SHARE = 0.62
const MIN_GAP = 0.06
const MAX_GAP = 0.2

/** The radius, as a share of the frame's width, that puts the frame's edge `bend` radians round the arc. */
export function arc(bend = BEND) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend))
}

/**
 * Lays the row out for a frame. Every film has the same height and keeps its own shape. The loop reaches far enough past
 * the frame's edges that a tile only ever wraps out of sight. One pass of the films is preferred, opening the gaps a
 * little to get there, so a film never meets itself; a very wide frame repeats the row instead of stretching the gaps.
 */
export function layoutReel(width, height, aspects, bend = BEND) {
  const widest = Math.max(...aspects)
  const tileHeight = Math.min(height / (EDGE_SWELL * 1.04), (MAX_WIDTH_SHARE * width) / widest)
  const radius = width * arc(bend)
  const widths = aspects.map((aspect) => aspect * tileHeight)
  const total = widths.reduce((sum, value) => sum + value, 0)
  const needed = 2 * bend * radius + widest * tileHeight

  let repeats = 1
  while ((needed - repeats * total) / (repeats * aspects.length) > MAX_GAP * tileHeight) repeats += 1
  const gap = Math.max(MIN_GAP * tileHeight, (needed - repeats * total) / (repeats * aspects.length))

  const tiles = []
  let edge = 0
  for (let pass = 0; pass < repeats; pass += 1) {
    widths.forEach((tileWidth, film) => {
      // The first film starts on the centre line.
      tiles.push({ film, width: tileWidth, s: edge + tileWidth / 2 - widths[0] / 2 })
      edge += tileWidth + gap
    })
  }
  return { width, height, radius, tileHeight, gap, loop: edge, tiles, reach: bend * radius }
}

/** Where a tile's centre sits along the row after the row has advanced by `offset`, wrapped into the loop. */
export function wrapPosition(s, offset, loop) {
  const position = (s - offset) % loop
  const half = loop / 2
  if (position > half) return position - loop
  if (position < -half) return position + loop
  return position
}

/** A point on the cylinder at `angle`, on screen: its x from the centre, and how much it has been scaled. */
export function project(angle, radius) {
  const scale = CAMERA / (CAMERA - 1 + Math.cos(angle))
  return { x: radius * Math.sin(angle) * scale, scale }
}

/**
 * Which tile, if any, is under a point in the frame: follows the ray from the camera out to the cylinder's wall. The camera
 * sits inside the cylinder, so there's exactly one hit in front of it.
 */
export function hitTile(layout, positions, x, y) {
  const { radius, tileHeight, tiles } = layout
  const camera = CAMERA * radius
  const fromAxis = camera - radius
  const a = x * x + camera * camera
  const halfB = fromAxis * camera
  const c = fromAxis * fromAxis - radius * radius
  const t = (halfB + Math.sqrt(halfB * halfB - a * c)) / a
  if (Math.abs(t * y) > tileHeight / 2) return -1
  const s = radius * Math.atan2(t * x, radius - (camera - t * camera))
  return tiles.findIndex((tile, index) => Math.abs(s - positions[index]) <= tile.width / 2)
}

/** A tile's box in the frame, as `{ x, y, width, height }` with x and y at its centre and y pointing down. Clipped to the frame. */
export function tileBox(layout, position, tile) {
  const { radius, tileHeight, reach, width: frameWidth, height: frameHeight } = layout
  const limit = reach / radius
  const clampAngle = (angle) => Math.max(-limit, Math.min(limit, angle))
  const left = clampAngle((position - tile.width / 2) / radius)
  const right = clampAngle((position + tile.width / 2) / radius)
  const near = project(Math.max(Math.abs(left), Math.abs(right)), radius)
  const x1 = project(left, radius).x
  const x2 = project(right, radius).x
  return {
    x: (x1 + x2) / 2,
    y: 0,
    width: Math.min(frameWidth, x2 - x1),
    height: Math.min(frameHeight, tileHeight * near.scale),
  }
}
