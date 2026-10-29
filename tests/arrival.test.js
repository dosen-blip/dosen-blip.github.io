import { afterEach, describe, expect, it, vi } from "vitest"
import { afterUncover, arrivalDelay } from "../src/transitions/arrival"
import { PULSE } from "../src/transitions/dots"
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
})
