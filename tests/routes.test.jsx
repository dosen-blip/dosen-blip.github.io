import { describe, expect, it } from "vitest"
import { disciplineRoutes, knownRoutes, projectRoutes, projectSlugs, staticRoutes } from "../src/data/routes"

describe("route manifest", () => {
  it("contains eight static routes, three of them discipline pages, and eleven project routes", () => {
    expect(staticRoutes).toHaveLength(8)
    expect(disciplineRoutes).toEqual(["/web", "/motion", "/ux"])
    expect(staticRoutes).toEqual(expect.arrayContaining(disciplineRoutes))
    expect(projectSlugs).toHaveLength(11)
    expect(projectRoutes).toHaveLength(11)
    expect(knownRoutes).toHaveLength(19)
    expect(new Set(knownRoutes).size).toBe(19)
  })
})
