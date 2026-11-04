import { afterEach, describe, expect, it, vi } from "vitest"
import { HIDE_DURATION, SHOW_DURATION, transition } from "../src/transitions/transitionStore"

afterEach(() => transition.reset())

describe("transition store", () => {
  it("covers the page, swaps under cover, then uncovers it", () => {
    const events = []
    const swap = vi.fn(() => events.push("swap-callback"))
    for (const name of ["hidestart", "swap", "showend"]) transition.on(name, () => events.push(name))

    transition.navigate(swap)
    expect(transition.phase).toBe("hiding")
    expect(events).toEqual(["hidestart"])

    transition.step(HIDE_DURATION / 2)
    expect(transition.cover).toBeCloseTo(.5)
    expect(swap).not.toHaveBeenCalled()

    transition.step(HIDE_DURATION / 2)
    expect(transition.cover).toBe(1)
    expect(swap).toHaveBeenCalledOnce()
    expect(transition.phase).toBe("showing")
    expect(events).toEqual(["hidestart", "swap-callback", "swap"])

    transition.step(SHOW_DURATION)
    expect(transition.cover).toBe(0)
    expect(transition.phase).toBe("idle")
    expect(events.at(-1)).toBe("showend")
  })

  it("lets a later request replace an earlier one while still covering", () => {
    const first = vi.fn()
    const second = vi.fn()
    transition.navigate(first)
    transition.step(HIDE_DURATION / 3)
    transition.navigate(second)
    transition.step(HIDE_DURATION)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it("covers the page again from where it is when interrupted while uncovering", () => {
    const hidestart = vi.fn()
    transition.on("hidestart", hidestart)
    transition.navigate(() => {})
    transition.step(HIDE_DURATION)
    transition.step(SHOW_DURATION / 2)
    const midway = transition.cover
    expect(midway).toBeCloseTo(.5)

    const swap = vi.fn()
    transition.navigate(swap)
    expect(transition.phase).toBe("hiding")
    expect(transition.cover).toBe(midway)
    expect(hidestart).toHaveBeenCalledOnce()
    transition.step(HIDE_DURATION)
    expect(swap).toHaveBeenCalledOnce()
    expect(transition.phase).toBe("showing")
  })

  it("draws a frame as soon as a transition starts and on every step", () => {
    const watch = vi.fn()
    transition.watchFrames(watch)
    transition.navigate(() => {})
    expect(watch).toHaveBeenCalledOnce()
    transition.step(.1)
    expect(watch).toHaveBeenCalledTimes(2)
  })

  it("keeps the options of the cut that is running when a later click arrives", () => {
    transition.navigate(() => {}, { style: "frame", hide: .2, show: .3, origin: { x: 1, y: 2, rect: null } })
    expect(transition.options).toMatchObject({ style: "frame", hide: .2, show: .3 })
    transition.navigate(() => {}, { style: "dots" })
    expect(transition.options.style).toBe("frame")

    transition.step(.2)
    expect(transition.phase).toBe("showing")
    transition.step(.3)
    expect(transition.phase).toBe("idle")

    transition.navigate(() => {})
    expect(transition.options).toMatchObject({ style: "dots", origin: null, hide: HIDE_DURATION, show: SHOW_DURATION })
  })

  it("marks when the cover starts opening, after any hold, and what is still covered until then", () => {
    const events = []
    transition.on("uncover", () => events.push(["uncover", transition.cover]))
    let coveredDuringSwap = null
    transition.navigate(() => { coveredDuringSwap = transition.covering }, { hide: .5, show: 1, uncoverAt: .25 })
    expect(transition.covering).toBe(true)

    transition.step(.5)
    expect(coveredDuringSwap).toBe(true)
    expect(transition.phase).toBe("showing")
    expect(events).toEqual([])

    transition.step(.2)
    expect(transition.covering).toBe(true)
    transition.step(.1)
    expect(events).toHaveLength(1)
    expect(transition.covering).toBe(false)

    transition.step(1)
    expect(transition.phase).toBe("idle")
    expect(events).toHaveLength(1)
  })

  it("uncovers at the swap when there is no hold, and again after an interrupted cut swaps", () => {
    let uncovers = 0
    transition.on("uncover", () => { uncovers += 1 })
    transition.navigate(() => {}, { hide: .5, show: 1 })
    transition.step(.5)
    expect(uncovers).toBe(1)

    transition.step(.3)
    transition.navigate(() => {})
    expect(transition.phase).toBe("hiding")
    transition.step(1)
    expect(uncovers).toBe(2)
  })

  it("runs a wave with no covered moment: the swap is immediate and the cut is one show", () => {
    const seen = []
    const stops = ["hidestart", "swap", "uncover", "showend"].map((name) => transition.on(name, () => seen.push(name)))
    const swap = vi.fn()
    transition.navigate(swap, { wave: true, hide: 0, show: 1 })
    expect(swap).toHaveBeenCalledOnce()
    expect(transition.phase).toBe("showing")
    expect(transition.cover).toBe(1)
    expect(transition.covering).toBe(false)
    expect(seen).toEqual(["hidestart", "swap", "uncover"])

    transition.step(.5)
    expect(transition.cover).toBeCloseTo(.5)

    // A second navigation starts again from the top, without reversing anything.
    const next = vi.fn()
    transition.navigate(next, { wave: true, hide: 0, show: 1 })
    expect(next).toHaveBeenCalledOnce()
    expect(transition.cover).toBe(1)
    expect(seen).toEqual(["hidestart", "swap", "uncover", "swap", "uncover"])

    transition.step(1)
    expect(transition.phase).toBe("idle")
    expect(seen.at(-1)).toBe("showend")
    stops.forEach((stop) => stop())
  })
})
