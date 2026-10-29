import { describe, expect, it } from "vitest"
import { PEN, anchorScale, inkOpacity, penLayout, strike, strokeProgress } from "../src/transitions/pen"
import { DOT_TIMING, PULSE } from "../src/transitions/dots"
import { WORDMARK_SHAPES } from "../src/brand/paths"

describe("pen bridge", () => {
  it("draws the shapes left to right, one after another", () => {
    expect(strokeProgress(PEN.start, 0)).toBe(0)
    expect(strokeProgress(PEN.start + PEN.draw / 2, 0)).toBeGreaterThan(strokeProgress(PEN.start + PEN.draw / 2, 5))
    const last = WORDMARK_SHAPES.length - 1
    expect(strokeProgress(PEN.start + last * PEN.stagger + PEN.draw, last)).toBe(1)
  })

  it("finishes the name and its ink while the screen is still held", () => {
    const last = WORDMARK_SHAPES.length - 1
    const drawn = PEN.start + last * PEN.stagger + PEN.draw
    const inked = PEN.ink + PEN.inkFor
    // The trailing edge leaves the click once the hold is over.
    const released = DOT_TIMING.hide + PULSE.hold
    expect(drawn).toBeLessThanOrEqual(released + .05)
    expect(inked).toBeLessThanOrEqual(released + .1)
    expect(inkOpacity(PEN.ink)).toBe(0)
    expect(inkOpacity(inked)).toBe(1)
  })

  it("strikes each stroke on like a tube catching, then holds steady", () => {
    expect(strike(PEN.start, 0)).toBe(0)
    const flicker = [.05, .1, .15, .2].map((t) => strike(PEN.start + t, 0))
    expect(Math.min(...flicker)).toBeLessThan(.6)
    expect(strike(PEN.start + 1, 0)).toBe(1)
  })

  it("pops each anchor in as the pen passes it", () => {
    expect(anchorScale(PEN.start, 0, 0, 4)).toBe(0)
    expect(anchorScale(PEN.start + PEN.anchor * .6, 0, 0, 4)).toBeCloseTo(1.5)
    expect(anchorScale(PEN.start + PEN.anchor, 0, 0, 4)).toBe(1)
    expect(anchorScale(PEN.start + PEN.anchor, 0, 3, 4)).toBe(0)
  })

  it("centres the name, wider on phones", () => {
    const desktop = penLayout(1280, 800)
    expect(desktop.x * 2 + 200 * desktop.scale).toBeCloseTo(1280)
    expect(desktop.y * 2 + 28 * desktop.scale).toBeCloseTo(800)
    expect(200 * penLayout(390, 844).scale / 390).toBeCloseTo(.8)
  })
})
