import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { projectIndex } from "../src/data/projectIndex"
import { projects } from "../src/data/projects"

describe("project records", () => {
  it("completes all nine index records in route order", () => {
    expect(projects.map((project) => project.slug)).toEqual(projectIndex.map((project) => project.slug))
  })

  it("preserves all seven HintonX video embeds and their descriptions", () => {
    const videoProject = projects.find((project) => project.slug === "video-production")
    const videos = videoProject.blocks.filter((block) => block.type === "youtube")

    expect(videos).toHaveLength(7)
    expect(videos.map((video) => video.id)).toEqual([
      "iUXu4dyxbSI",
      "hYZgGD9qSzY",
      "Kjk2cX7xaNU",
      "qzKlpU0CvGM",
      "3mxLcNnxfNU",
      "5OH6sWLEL8c",
      "bmYRh4Yy1nk",
    ])
    expect(videos.every((video) => video.title && video.description)).toBe(true)
  })

  it("uses valid blocks, localized assets, valid related slugs, and route SEO", () => {
    const slugs = new Set(projects.map((project) => project.slug))
    const blockTypes = new Set(["richText", "image", "youtube", "link"])
    for (const project of projects) {
      expect(project.title).toBeTruthy()
      expect(project.category).toBeTruthy()
      expect(project.client).toBeTruthy()
      expect(project.duration).toBeTruthy()
      expect(project.blocks.length).toBeGreaterThan(0)
      expect(project.relatedSlugs.length).toBeGreaterThanOrEqual(2)
      expect(project.seo.title).toBeTruthy()
      expect(project.seo.description).toBeTruthy()
      expect(fs.existsSync(path.join(process.cwd(), "public", project.cover))).toBe(true)
      for (const image of project.gallery) expect(fs.existsSync(path.join(process.cwd(), "public", image))).toBe(true)
      for (const related of project.relatedSlugs) expect(slugs.has(related)).toBe(true)
      for (const block of project.blocks) {
        expect(blockTypes.has(block.type)).toBe(true)
        if (block.type === "image") expect(fs.existsSync(path.join(process.cwd(), "public", block.src))).toBe(true)
      }
    }
  })
})
