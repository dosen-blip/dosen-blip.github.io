import { describe, expect, it } from "vitest"
import { BEND, arc, hitTile, layoutReel, project, tileBox, wrapPosition } from "../src/scenes/reel/geometry"

const ASPECTS = [16 / 9, 9 / 16, 16 / 9, 9 / 16]
const positionsAt = (layout, offset) => layout.tiles.map((tile) => wrapPosition(tile.s, offset, layout.loop))

describe("film reel geometry", () => {
  it("puts the frame's edge at the bend", () => {
    const width = 1440
    const radius = width * arc()
    expect(project(BEND, radius).x).toBeCloseTo(width / 2, 6)
    expect(project(-BEND, radius).x).toBeCloseTo(-width / 2, 6)
    expect(project(0, radius)).toEqual({ x: 0, scale: 1 })
  })

  it.each([[375, 300], [909, 418], [1440, 662], [1920, 720]])("wraps a tile only out of sight at %ix%i", (width, height) => {
    const layout = layoutReel(width, height, ASPECTS)
    const widest = Math.max(...layout.tiles.map((tile) => tile.width))
    expect(layout.loop / 2 - widest / 2).toBeGreaterThanOrEqual(layout.reach - 1e-6)
    // Edge to edge, the largest a tile gets still fits the frame's height.
    expect(layout.tileHeight * project(BEND, layout.radius).scale).toBeLessThanOrEqual(height)
  })

  it("shows each film once on ordinary screens and repeats the row only on very wide ones", () => {
    expect(layoutReel(375, 300, ASPECTS).tiles).toHaveLength(4)
    expect(layoutReel(1440, 662, ASPECTS).tiles).toHaveLength(4)
    expect(layoutReel(3840, 400, ASPECTS).tiles.length).toBeGreaterThan(4)
  })

  it("keeps a position inside the loop however far the row has run", () => {
    expect(wrapPosition(100, 0, 1000)).toBe(100)
    expect(wrapPosition(100, 300, 1000)).toBe(-200)
    expect(wrapPosition(100, 800, 1000)).toBe(300)
    expect(wrapPosition(100, 5100, 1000)).toBeCloseTo(0)
  })

  it("hits the tile that's drawn under a point, and nothing above or below the row", () => {
    const layout = layoutReel(1440, 662, ASPECTS)
    const positions = positionsAt(layout, 0)
    expect(hitTile(layout, positions, 0, 0)).toBe(0)
    expect(hitTile(layout, positions, 0, layout.tileHeight * .49)).toBe(0)
    expect(hitTile(layout, positions, 0, layout.tileHeight * .51)).toBe(-1)

    // The point a tile's centre projects to hits that tile, wherever it has got to.
    const moved = positionsAt(layout, 500)
    moved.forEach((position, index) => {
      if (Math.abs(position) > layout.reach * .9) return
      const { x } = project(position / layout.radius, layout.radius)
      expect(hitTile(layout, moved, x, 0)).toBe(index)
    })
  })

  it("boxes a tile inside the frame", () => {
    const layout = layoutReel(1440, 662, ASPECTS)
    const positions = positionsAt(layout, 900)
    layout.tiles.forEach((tile, index) => {
      if (Math.abs(positions[index]) - tile.width / 2 > layout.reach) return
      const box = tileBox(layout, positions[index], tile)
      expect(box.height).toBeLessThanOrEqual(662)
      expect(Math.abs(box.x) + box.width / 2).toBeLessThanOrEqual(720 + 1e-6)
    })
  })
})
