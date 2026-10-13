import { describe, expect, it } from "vitest"
import { disciplineRoutes, knownRoutes, projectRoutes, projectSlugs, staticRoutes } from "../src/data/routes"

describe("route manifest", () => {
  it("contains eight static routes, three of them discipline pages, and ten project routes", () => {
    expect(staticRoutes).toHaveLength(8)
    expect(disciplineRoutes).toEqual(["/web", "/motion", "/ux"])
    expect(staticRoutes).toEqual(expect.arrayContaining(disciplineRoutes))
    expect(projectSlugs).toHaveLength(10)
    expect(projectRoutes).toHaveLength(10)
    expect(knownRoutes).toHaveLength(18)
    expect(new Set(knownRoutes).size).toBe(18)
  })
})
