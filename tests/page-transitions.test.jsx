import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Link, MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { App } from "../src/App"
import { transition } from "../src/transitions/transitionStore"
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

const observers = new Set()

/** Report every observed element as on screen, as a browser would once the new page has rendered. */
function intersectAll() {
  for (const observer of [...observers]) {
    for (const node of observer.nodes) observer.callback([{ isIntersecting: true, target: node }])
  }
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
  // Intersection observers can be fired by hand: each remembers its callback and elements.
  class Intersections {
    constructor(callback) { this.callback = callback; this.nodes = []; observers.add(this) }
    observe(node) { this.nodes.push(node) }
    unobserve() {}
    disconnect() { observers.delete(this) }
  }
  observers.clear()
  vi.stubGlobal("IntersectionObserver", Intersections)
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
    expect(transition.options.style).toBe("dots")
    expect(lenis.stop).toHaveBeenCalledOnce()
    expect(document.querySelector(".transition-overlay")).toHaveClass("is-active")
    expect(window.scrollTo).not.toHaveBeenCalled()

    act(() => transition.step(transition.options.hide))
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(/work in/i)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(lenis.scrollTo).toHaveBeenCalledWith(0, { immediate: true, force: true })
    expect(lenis.start).not.toHaveBeenCalled()

    act(() => transition.step(transition.options.show))
    expect(transition.phase).toBe("idle")
    expect(lenis.start).toHaveBeenCalledOnce()
    expect(document.querySelector(".transition-overlay")).not.toHaveClass("is-active")
  })

  it("holds the new page's entrances until the cut opens, then lets them rise", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    mount("/stack", { reduced: false })
    fireEvent.click(screen.getByRole("link", { name: "Go to About" }))
    act(() => transition.step(transition.options.hide))
    const hero = document.querySelector(".about-hero")
    expect(hero).toHaveClass("reveal-pending")

    // The section is on screen but the pulse's trailing edge has not reached it: it must not start rising unseen.
    act(() => intersectAll())
    expect(hero).not.toHaveClass("reveal-in")

    act(() => vi.advanceTimersByTime(1000))
    expect(hero).toHaveClass("reveal-in")
    vi.useRealTimers()
  })

  it("cuts through a snapshot where the browser can: no covered moment, and still the old cut for the selection box", async () => {
    const updates = []
    document.startViewTransition = vi.fn((update) => {
      updates.push(update)
      return { ready: new Promise(() => {}), skipTransition: vi.fn() }
    })
    try {
      mount("/stack", { reduced: false })
      fireEvent.click(screen.getByRole("link", { name: "Go to About" }))
      expect(document.startViewTransition).toHaveBeenCalledOnce()
      expect(document.querySelector(".about-hero")).toBeNull() // the browser takes its picture first

      act(() => updates[0]())
      expect(document.querySelector(".about-hero")).not.toBeNull()
      expect(transition.options.wave).toBe(true)
      expect(transition.phase).toBe("showing")
      expect(document.querySelector(".transition-overlay")).toHaveClass("is-active")

      act(() => transition.step(transition.options.show))
      expect(transition.phase).toBe("idle")
      expect(lenis.start).toHaveBeenCalledOnce()
    } finally {
      delete document.startViewTransition
    }
  })

  it("keeps the header on the page being shown until the swap", () => {
    mount("/contact", { reduced: false })
    const contact = () => screen.getAllByRole("link", { name: "Contact" })[0]
    expect(contact()).toHaveAttribute("aria-current", "page")

    fireEvent.click(screen.getByRole("link", { name: "Go to About" }))
    expect(contact()).toHaveAttribute("aria-current", "page")

    act(() => transition.step(transition.options.hide))
    expect(contact()).not.toHaveAttribute("aria-current")
  })

  it("cuts with the selection box when a project card is clicked", () => {
    mount("/projects", { reduced: false })
    const card = document.querySelector("a.project-card")
    const title = card.querySelector("h2, h3").textContent

    fireEvent.click(card, { clientX: 40, clientY: 60, detail: 1 })
    expect(transition.options.style).toBe("frame")
    expect(transition.options.origin).toMatchObject({ x: 40, y: 60 })
    expect(transition.options.origin.rect).toBeTruthy()

    act(() => transition.step(transition.options.hide))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title)
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
