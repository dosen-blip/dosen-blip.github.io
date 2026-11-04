import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { WAVE_TIMING, revealRadius, waveOrigin } from "../src/transitions/dots"
import { canSnapshot, cutThroughSnapshot } from "../src/transitions/snapshot"
import { transition } from "../src/transitions/transitionStore"

const options = { style: "dots", origin: { x: 100, y: 50 }, ...WAVE_TIMING }

let views
let reveal

beforeEach(() => {
  views = []
  reveal = { pause: vi.fn(), cancel: vi.fn(), currentTime: null }
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  document.startViewTransition = vi.fn((update) => {
    const view = { skipTransition: vi.fn(), ready: Promise.resolve() }
    views.push(view)
    update()
    return view
  })
  document.documentElement.animate = vi.fn(() => reveal)
})

afterEach(() => {
  transition.reset()
  delete document.startViewTransition
  delete document.documentElement.animate
  vi.unstubAllGlobals()
})

describe("snapshot cut", () => {
  it("is only on offer where the browser has the API", () => {
    expect(canSnapshot()).toBe(true)
    delete document.startViewTransition
    expect(canSnapshot()).toBe(false)
  })

  it("changes the page inside the view transition and starts the wave", () => {
    const swap = vi.fn()
    cutThroughSnapshot(swap, options)
    expect(swap).toHaveBeenCalledOnce()
    expect(transition.options.wave).toBe(true)
    expect(transition.phase).toBe("showing")
  })

  it("clips the new page to a circle at the click that stays under the pulse", async () => {
    cutThroughSnapshot(() => {}, options)
    await views[0].ready
    const [keyframes, timing] = document.documentElement.animate.mock.calls[0]
    expect(timing.pseudoElement).toBe("::view-transition-new(root)")
    expect(keyframes.clipPath[0]).toBe("circle(0px at 100px 50px)")
    expect(reveal.pause).toHaveBeenCalledOnce()

    transition.step(WAVE_TIMING.show / 2)
    const wave = waveOrigin(window.innerWidth, window.innerHeight, options.origin)
    expect(reveal.currentTime).toBeCloseTo((revealRadius(.5, wave) / revealRadius(0, wave)) * timing.duration)
  })

  it("ends the view transition when the cut ends", async () => {
    cutThroughSnapshot(() => {}, options)
    await views[0].ready
    transition.step(WAVE_TIMING.show / 2)
    expect(views[0].skipTransition).not.toHaveBeenCalled()
    transition.step(WAVE_TIMING.show)
    expect(views[0].skipTransition).toHaveBeenCalledOnce()
    expect(reveal.cancel).toHaveBeenCalledOnce() // or they pile up on the document, one per cut
  })

  it("hands over to a newer cut, which scrubs its own circle", async () => {
    cutThroughSnapshot(() => {}, options)
    await views[0].ready
    const first = reveal
    transition.step(.1)
    const stuck = first.currentTime

    reveal = { pause: vi.fn(), cancel: vi.fn(), currentTime: null }
    cutThroughSnapshot(() => {}, { ...options, origin: null })
    await views[1].ready
    transition.step(.1)
    expect(first.currentTime).toBe(stuck)
    expect(first.cancel).toHaveBeenCalledOnce()
    expect(reveal.currentTime).toBeGreaterThanOrEqual(0)

    transition.step(WAVE_TIMING.show)
    expect(views[1].skipTransition).toHaveBeenCalledOnce()
    expect(views[0].skipTransition).not.toHaveBeenCalled() // the browser already skipped it for the newer one
  })

  it("carries on when the browser skips the transition (a hidden tab)", async () => {
    document.startViewTransition = vi.fn((update) => {
      update()
      return { skipTransition: vi.fn(), ready: Promise.reject(new DOMException("skipped")) }
    })
    const swap = vi.fn()
    cutThroughSnapshot(swap, options)
    await new Promise((resolve) => setTimeout(resolve))
    expect(swap).toHaveBeenCalledOnce()
    expect(document.documentElement.animate).not.toHaveBeenCalled()
    transition.step(WAVE_TIMING.show)
    expect(transition.phase).toBe("idle")
  })
})
