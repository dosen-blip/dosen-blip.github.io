import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Link, MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RouteScrollReset } from "../src/components/RouteScrollReset"

const lenis = vi.hoisted(() => ({
  scrollTo: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock("lenis/react", () => ({ useLenis: () => lenis }))

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("route scroll reset", () => {
  it("cancels the previous Lenis target and returns new routes to the top", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <RouteScrollReset />
        <Link to="/projects/frequency-shift">Open Frequency Shift</Link>
      </MemoryRouter>,
    )

    vi.clearAllMocks()
    fireEvent.click(screen.getByRole("link", { name: "Open Frequency Shift" }))

    expect(lenis.stop).toHaveBeenCalledOnce()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(lenis.scrollTo).toHaveBeenCalledWith(0, { immediate: true, force: true })
    expect(lenis.start).toHaveBeenCalledOnce()
  })
})
