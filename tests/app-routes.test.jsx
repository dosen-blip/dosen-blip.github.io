import { cleanup, render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { App } from "../src/App"
import { knownRoutes } from "../src/data/routes"
import { metaFor, seoFor } from "../src/utils/seo"

function renderPath(path) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

function prerenderedTitle(path) {
  return new DOMParser().parseFromString(seoFor({ path, ...metaFor(path) }), "text/html").title
}

function mountedTitle(path) {
  vi.stubGlobal("scrollTo", vi.fn())
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  HTMLCanvasElement.prototype.getContext = () => null
  document.title = "stale"
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  return document.title
}

describe("tab titles", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it.each(knownRoutes)("gives %s the prerendered title", (route) => {
    const title = prerenderedTitle(route)
    expect(title).not.toBe("")
    expect(mountedTitle(route)).toBe(title)
  })

  it("ignores the trailing slash GitHub Pages adds on a direct load", () => {
    expect(mountedTitle("/about/")).toBe(prerenderedTitle("/about"))
    cleanup()
    expect(mountedTitle("/projects/instinct-groove/")).toBe(prerenderedTitle("/projects/instinct-groove"))
  })

  it("gives unknown routes the prerendered 404's title", () => {
    expect(mountedTitle("/not-a-route")).toBe(prerenderedTitle("/not-found"))
    cleanup()
    expect(mountedTitle("/projects/not-a-project")).toBe(prerenderedTitle("/not-found"))
  })
})

describe("application routes", () => {
  it.each(knownRoutes)("resolves %s", (route) => {
    const html = renderPath(route)
    expect(html).not.toContain("not-found-page")
    expect(html).not.toContain("opacity:0")
    expect(html.length).toBeGreaterThan(500)
  })

  it("renders the standalone 404 for unknown routes", () => {
    const html = renderPath("/not-a-route")
    expect(html).toContain("not-found-page")
    expect(html).toContain("Back to home")
  })
})
