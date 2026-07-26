import { describe, expect, it } from "vitest"
import { knownRoutes, projectRoutes, projectSlugs, staticRoutes } from "../src/data/routes"

describe("route manifest", () => {
  it("contains five static and eight project routes", () => {
    expect(staticRoutes).toHaveLength(5)
    expect(projectSlugs).toHaveLength(8)
    expect(projectRoutes).toHaveLength(8)
    expect(knownRoutes).toHaveLength(13)
    expect(new Set(knownRoutes).size).toBe(13)
  })
})
