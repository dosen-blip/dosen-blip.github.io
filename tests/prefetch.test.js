import { describe, expect, it } from "vitest"
import { mediaFor } from "../src/transitions/prefetch"
import { projectIndex, projectsFor } from "../src/data/projectIndex"

describe("prefetch", () => {
  it("knows the media at the top of each kind of page", () => {
    const project = mediaFor("/projects/frequency-shift")
    expect(project.images[0]).toBe(projectIndex.find((item) => item.slug === "frequency-shift").cover)
    expect(project.images).toContain("/assets/frequency-shift/hero-crowd.webp")
    expect(project.images.length).toBeLessThanOrEqual(4)

    expect(mediaFor("/motion")).toEqual({ images: projectsFor("motion").slice(0, 4).map((item) => item.cover), videos: [] })
    expect(mediaFor("/about", 1440).images).toEqual(["/assets/portrait-desktop.png"])
    expect(mediaFor("/about", 390).images).toEqual(["/assets/portrait-mobile.png"])
    expect(mediaFor("/contact")).toEqual({ images: [], videos: [] })
  })
})
