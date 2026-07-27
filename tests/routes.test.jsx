import { describe, expect, it } from "vitest"
import { knownRoutes, projectRoutes, projectSlugs, staticRoutes } from "../src/data/routes"

describe("route manifest", () => {
  it("contains five static and nine project routes", () => {
    expect(staticRoutes).toHaveLength(5)
    expect(projectSlugs).toHaveLength(9)
    expect(projectRoutes).toHaveLength(9)
    expect(knownRoutes).toHaveLength(14)
    expect(new Set(knownRoutes).size).toBe(14)
  })
})
