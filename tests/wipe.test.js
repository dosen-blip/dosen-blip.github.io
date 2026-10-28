import { describe, expect, it } from "vitest"
import { BAR, BAR_DIM, EDGE_FADE, STAGE, UNIT_MAX, drawWipe, expoInOut, wipeFrame } from "../src/transitions/wipe"

describe("wipe geometry", () => {
  it("sizes the unit from the viewport, capped on wide screens", () => {
    expect(wipeFrame(600, 400, 1, "hiding").unit).toBe(20)
    expect(wipeFrame(2560, 1440, 1, "hiding").unit).toBe(UNIT_MAX)
  })

  it("rests as a one-unit bar at the centre when the page is covered", () => {
    const frame = wipeFrame(1440, 900, 1, "hiding")
    expect(frame.spread).toBe(0)
    expect(frame.scale).toBe(frame.unit)
    expect(frame.rotation).toBeCloseTo(0)
    expect(frame.offsetX).toBeCloseTo(0)
    expect(frame.offsetY).toBeCloseTo(0)
    expect(frame.opacity).toBe(1)
  })

  it("spans the whole diagonal, tilted, when the page is visible, and fades at that edge", () => {
    const frame = wipeFrame(1440, 900, 0, "hiding")
    expect(frame.spread).toBe(1)
    expect(frame.scale).toBeGreaterThan(Math.hypot(1440, 900))
    expect(frame.rotation).toBe(-1)
    expect(wipeFrame(1440, 900, 0, "showing").rotation).toBe(1)
    expect(frame.opacity).toBe(0)
    expect(wipeFrame(1440, 900, EDGE_FADE / 2, "showing").opacity).toBeCloseTo(.5)
  })

  it("eases symmetrically", () => {
    expect(expoInOut(0)).toBe(0)
    expect(expoInOut(.5)).toBeCloseTo(.5)
    expect(expoInOut(1)).toBe(1)
    expect(expoInOut(.25) + expoInOut(.75)).toBeCloseTo(1)
  })
})

describe("drawWipe", () => {
  it("paints the stage, then the dim bar, then the lit share of it", () => {
    const calls = []
    const ctx = new Proxy({}, {
      get: (_target, name) => name === "fillStyle" ? undefined : (...args) => calls.push([name, ...args]),
      set: (_target, name, value) => { calls.push([`set ${name}`, value]); return true },
    })
    drawWipe(ctx, { width: 1440, height: 900, dpr: 2, cover: 1, phase: "hiding", progress: .4 })
    const fills = calls.filter(([name]) => name === "set fillStyle").map(([, value]) => value)
    expect(fills).toEqual([STAGE, BAR_DIM, BAR])
    const rects = calls.filter(([name]) => name === "fillRect")
    expect(rects[0]).toEqual(["fillRect", 0, 0, 1442, 902])
    expect(rects[1]).toEqual(["fillRect", -2.5, -.5, 5, 1])
    expect(rects[2]).toEqual(["fillRect", -2.5, -.5, 2, 1])
    expect(calls.filter(([name]) => name === "scale")[0]).toEqual(["scale", 2, 2])
  })
})
