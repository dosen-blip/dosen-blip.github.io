import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { App } from "../src/App"
import { knownRoutes } from "../src/data/routes"

function renderPath(path) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

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
    expect(html).toContain("Go Back Home")
  })
})
