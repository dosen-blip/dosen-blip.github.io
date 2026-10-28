import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Link, MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { App } from "../src/App"
import { HIDE_DURATION, SHOW_DURATION, transition } from "../src/transitions/transitionStore"
import { markHydrated } from "../src/utils/hydration"

const lenis = vi.hoisted(() => ({ scrollTo: vi.fn(), start: vi.fn(), stop: vi.fn() }))

vi.mock("lenis/react", () => ({
  ReactLenis: ({ children }) => children,
  useLenis: () => lenis,
}))

// jsdom has no canvas; the overlay draws nothing here.
HTMLCanvasElement.prototype.getContext = () => null

function Address() {
  return <output data-testid="address">{useLocation().pathname}</output>
}

function mount(path, { reduced }) {
  window.matchMedia = (query) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false },
  })
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Address />
      <Link to="/about">Go to About</Link>
      <Link to="/stack">Go to Tools again</Link>
    </MemoryRouter>,
  )
  markHydrated()
  return view
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn())
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  class Observer { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal("IntersectionObserver", Observer)
  vi.stubGlobal("ResizeObserver", Observer)
})

afterEach(() => {
  cleanup()
  transition.reset()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("page transitions", () => {
  it("changes the address at once but keeps the old page until the wipe has covered it", () => {
    mount("/stack", { reduced: false })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/work in/i)

    fireEvent.click(screen.getByRole("link", { name: "Go to About" }))
    expect(screen.getByTestId("address")).toHaveTextContent("/about")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/work in/i)
    expect(transition.phase).toBe("hiding")
    expect(lenis.stop).toHaveBeenCalledOnce()
    expect(document.querySelector(".transition-overlay")).toHaveClass("is-active")
    expect(window.scrollTo).not.toHaveBeenCalled()

    act(() => transition.step(HIDE_DURATION))
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(/work in/i)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(lenis.scrollTo).toHaveBeenCalledWith(0, { immediate: true, force: true })
    expect(lenis.start).not.toHaveBeenCalled()

    act(() => transition.step(SHOW_DURATION))
    expect(transition.phase).toBe("idle")
    expect(lenis.start).toHaveBeenCalledOnce()
    expect(document.querySelector(".transition-overlay")).not.toHaveClass("is-active")
  })

  it("swaps immediately, with no wipe, under reduced motion", () => {
    mount("/stack", { reduced: true })
    fireEvent.click(screen.getByRole("link", { name: "Go to About" }))
    expect(transition.phase).toBe("idle")
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(/work in/i)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(lenis.scrollTo).toHaveBeenCalledWith(0, { immediate: true, force: true })
  })

  it("scrolls back to the top without a wipe when the same page is asked for again", () => {
    mount("/stack", { reduced: false })
    fireEvent.click(screen.getByRole("link", { name: "Go to Tools again" }))
    expect(transition.phase).toBe("idle")
    expect(lenis.scrollTo).toHaveBeenCalledWith(0)
    expect(lenis.stop).not.toHaveBeenCalled()
  })
})
