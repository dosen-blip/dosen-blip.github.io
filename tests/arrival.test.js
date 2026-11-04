import { afterEach, describe, expect, it, vi } from "vitest"
import { afterCut, afterUncover, arrivalDelay } from "../src/transitions/arrival"
import { PULSE, WAVE } from "../src/transitions/dots"
import { transition } from "../src/transitions/transitionStore"

afterEach(() => {
  transition.reset()
  vi.useRealTimers()
})

const dots = { style: "dots", origin: { x: 0, y: 0 } }

describe("arrival", () => {
  it("brings content in as the dot pulse's trailing edge reaches it, nearest the click first", () => {
    const near = arrivalDelay({ x: 0, y: 0, width: 100, height: 50 }, 1000, 600, dots)
    const far = arrivalDelay({ x: 900, y: 500, width: 100, height: 100 }, 1000, 600, dots)
    expect(near).toBeLessThan(far)
    expect(far).toBeLessThanOrEqual(PULSE.open + PULSE.shrink)
    expect(arrivalDelay({ x: 900, y: 500, width: 100, height: 100 }, 1000, 600, { style: "frame", origin: null })).toBe(0)
  })

  it("follows the wave's trailing edge the same way", () => {
    const wave = { ...dots, wave: true }
    const near = arrivalDelay({ x: 0, y: 0, width: 100, height: 50 }, 1000, 600, wave)
    const far = arrivalDelay({ x: 900, y: 500, width: 100, height: 100 }, 1000, 600, wave)
    expect(near).toBeGreaterThan(WAVE.grow)
    expect(far).toBeGreaterThan(near)
    expect(far).toBeLessThanOrEqual(WAVE.travel + WAVE.grow + WAVE.gap + WAVE.shrink)
  })

  it("runs at once when nothing is covering the page", () => {
    const arrive = vi.fn()
    afterUncover(null, arrive)
    expect(arrive).toHaveBeenCalledOnce()
  })

  it("waits for the cover to open over the element, and can be cancelled", () => {
    vi.useFakeTimers()
    const node = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) }
    const arrive = vi.fn()
    const cancelled = vi.fn()
    let cancel = null
    transition.navigate(() => {
      afterUncover(node, arrive)
      cancel = afterUncover(node, cancelled)
    }, { hide: .5, show: 1, uncoverAt: .2, style: "frame" })
    transition.step(.5)
    cancel()
    expect(arrive).not.toHaveBeenCalled()

    transition.step(.25)
    vi.runAllTimers()
    expect(arrive).toHaveBeenCalledOnce()
    expect(cancelled).not.toHaveBeenCalled()
  })

  it("makes a late asker wait for the edge too, less the time it has already travelled", () => {
    vi.useFakeTimers()
    const far = { getBoundingClientRect: () => ({ left: innerWidth - 10, top: innerHeight - 10, width: 10, height: 10 }) }
    const full = arrivalDelay(far.getBoundingClientRect(), innerWidth, innerHeight, dots)

    transition.navigate(() => {}, { hide: .5, show: 1, ...dots })
    transition.step(.5)
    const arrive = vi.fn()
    transition.step(.1)
    afterUncover(far, arrive)
    expect(arrive).not.toHaveBeenCalled()
    vi.advanceTimersByTime((full - .1) * 1000 - 5)
    expect(arrive).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(arrive).toHaveBeenCalledOnce()
  })

  it("cancels a late asker", () => {
    vi.useFakeTimers()
    const node = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) }
    transition.navigate(() => {}, { hide: .5, show: 1, ...dots })
    transition.step(.5)
    const arrive = vi.fn()
    afterUncover(node, arrive)()
    vi.runAllTimers()
    expect(arrive).not.toHaveBeenCalled()
  })

  it("waits for the whole cut for an entrance worth watching from the start", () => {
    const arrive = vi.fn()
    transition.navigate(() => {}, { wave: true, show: 1 })
    const cancel = afterCut(arrive)
    transition.step(.5)
    expect(arrive).not.toHaveBeenCalled()
    transition.step(.6)
    expect(arrive).toHaveBeenCalledTimes(1)
    cancel()

    const now = vi.fn()
    afterCut(now)
    expect(now).toHaveBeenCalledTimes(1)
  })
})

