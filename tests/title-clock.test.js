import { describe, expect, it } from "vitest"
import { buildTime, realDuration } from "../src/transitions/titleClock"

describe("title clock", () => {
  it("starts slowly and picks up speed without jumping", () => {
    expect(buildTime(0)).toBe(0)
    const step = (at) => buildTime(at + 16) - buildTime(at)
    expect(step(0)).toBeLessThan(5)
    expect(step(300)).toBeGreaterThan(step(0))
    expect(step(800)).toBeGreaterThan(step(300))
    expect(step(800)).toBeCloseTo(16 * 1.25, 3)
    expect(Math.abs(step(649) - step(651))).toBeLessThan(.5)
  })

  it("inverts: a build takes the real time it says it does", () => {
    for (const duration of [100, 445, 1000, 1850]) expect(buildTime(realDuration(duration))).toBeCloseTo(duration, 3)
  })
})
