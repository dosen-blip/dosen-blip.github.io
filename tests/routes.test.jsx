import { describe, expect, it } from "vitest"
import { knownRoutes, projectRoutes, projectSlugs, staticRoutes } from "../src/data/routes"

describe("route manifest", () => {
  it("contains five static and ten project routes", () => {
    expect(staticRoutes).toHaveLength(5)
    expect(projectSlugs).toHaveLength(10)
    expect(projectRoutes).toHaveLength(10)
    expect(knownRoutes).toHaveLength(15)
    expect(new Set(knownRoutes).size).toBe(15)
  })
})
