import { describe, expect, it } from "vitest"
import { CELL, EDGE, REACH, dotSize, drawDots, waveFront, waveOrigin } from "../src/transitions/dots"

const colors = { stage: "#0c0c0f", accent: "#386dff" }

function fakeContext() {
  const calls = []
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key]
      return (...args) => calls.push([key, ...args, ctx.fillStyle])
    },
    set(target, key, value) {
      target[key] = value
      return true
    },
  })
  return { ctx, calls }
}

describe("dot grid cut", () => {
  it("closes the grid completely at full size", () => {
    // Four dots meet at the middle of each cell, half a diagonal away.
    expect(REACH).toBeGreaterThan(Math.hypot(CELL, CELL) / 2)
  })

  it("starts the pulse at the click, or the middle of the screen without one", () => {
    expect(waveOrigin(1000, 600, { x: 100, y: 50 })).toMatchObject({ x: 100, y: 50 })
    expect(waveOrigin(1000, 600, null)).toMatchObject({ x: 500, y: 300, reach: Math.hypot(500, 300) })
    expect(waveOrigin(1000, 600, { x: 0, y: 0 }).reach).toBeCloseTo(Math.hypot(1000, 600))
  })

  it("grows dots near the origin first and closes everything at full cover", () => {
    expect(dotSize(0, "hiding", 0)).toBe(0)
    expect(dotSize(.4, "hiding", 0)).toBeGreaterThan(dotSize(.4, "hiding", .5))
    expect(dotSize(.4, "hiding", 1)).toBe(0)
    expect(dotSize(1, "hiding", 1)).toBe(1)
  })

  it("empties dots near the origin first when showing", () => {
    expect(dotSize(1, "showing", 0)).toBe(1)
    expect(dotSize(.6, "showing", 0)).toBeLessThan(dotSize(.6, "showing", .8))
    expect(dotSize(0, "showing", 1)).toBe(0)
  })

  it("is a band, not a blackout: near the click the page is back while the far side is still covered", () => {
    expect(dotSize(.4, "showing", 0)).toBe(0)
    expect(dotSize(.4, "showing", 1)).toBe(1)
    // Partway through hiding, the click has closed and the far corner has not been reached.
    expect(dotSize(.5, "hiding", 0)).toBe(1)
    expect(dotSize(.5, "hiding", 1)).toBe(0)
  })

  it("reports how far the hiding wave has travelled", () => {
    const wave = { x: 0, y: 0, reach: 1000 }
    expect(waveFront(0, wave)).toBe(0)
    expect(waveFront(.5, wave)).toBeGreaterThan(0)
    expect(waveFront(1, wave)).toBe(1000)
  })

  it("fills the screen at full cover and leads the wave with blue dots", () => {
    const full = fakeContext()
    drawDots(full.ctx, { width: 300, height: 200, dpr: 1, cover: 1, phase: "hiding", colors })
    expect(full.calls.find(([name]) => name === "fillRect")).toEqual(["fillRect", -1, -1, 302, 202, colors.stage])

    const mid = fakeContext()
    drawDots(mid.ctx, { width: 300, height: 200, dpr: 1, cover: .45, phase: "hiding", origin: { x: 0, y: 0 }, colors })
    const fills = mid.calls.filter(([name]) => name === "fill").map((call) => call.at(-1))
    expect(fills).toEqual([colors.stage, colors.accent])
    const arcs = mid.calls.filter(([name]) => name === "arc")
    expect(arcs.length).toBeGreaterThan(0)
    expect(arcs.every(([, , , radius]) => radius > 0 && radius <= REACH)).toBe(true)
    expect(arcs.some(([, , , radius]) => radius < EDGE * REACH)).toBe(true)
  })
})
