import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { projectIndex } from "../src/data/projectIndex"
import { projects } from "../src/data/projects"

describe("project records", () => {
  it("completes all ten index records in route order", () => {
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
      expect(project.relatedSlugs.length).toBeGreaterThanOrEqual(2)
      expect(project.seo.title).toBeTruthy()
      expect(project.seo.description).toBeTruthy()
      expect(fs.existsSync(path.join(process.cwd(), "public", project.cover))).toBe(true)
      for (const image of project.gallery) expect(fs.existsSync(path.join(process.cwd(), "public", image))).toBe(true)
      for (const related of project.relatedSlugs) expect(slugs.has(related)).toBe(true)

      if (project.layout === "frequencyShift") {
        expect(project.liveUrl).toBe("https://frequencyshift.ca/")
        expect(project.content.hero.dek).toContain("directing the identity")
        expect(project.content.hero.meta.map((item) => item.label)).toEqual(["Role", "Platform", "Output", "Period"])
        expect(project.content.hero.meta.find((item) => item.label === "Output")?.value).toBe("Web Development / Video Editing")
        expect(project.content.motion.slots).toHaveLength(2)
        expect(project.content.motion.slots.filter((slot) => slot.src)).toHaveLength(2)
        for (const slot of project.content.motion.slots.filter((item) => item.src)) {
          expect(slot.src.startsWith("/assets/")).toBe(true)
          expect(slot.poster.startsWith("/assets/")).toBe(true)
          expect(slot.fallbackUrl).toMatch(/^https:\/\/frequencyshift\.ca\/archive\//)
          expect(fs.existsSync(path.join(process.cwd(), "public", slot.src))).toBe(true)
          expect(fs.existsSync(path.join(process.cwd(), "public", slot.poster))).toBe(true)
        }
        expect(fs.existsSync(path.join(process.cwd(), "public", project.content.hero.image))).toBe(true)
        expect(fs.existsSync(path.join(process.cwd(), "public", project.content.web.homeScreenshot))).toBe(true)
        expect(project.content.featuredPosts).toHaveLength(5)
        for (const post of project.content.featuredPosts) {
          expect(post.title).toBeTruthy()
          expect(post.venue).toBeTruthy()
          expect(post.credit).toBeTruthy()
          expect(post.alt.length).toBeGreaterThan(20)
          expect(post.src.startsWith("/assets/frequency-shift/photos/")).toBe(true)
          expect(post.href).toMatch(/^https:\/\/www\.instagram\.com\/p\//)
          expect(fs.existsSync(path.join(process.cwd(), "public", post.src))).toBe(true)
        }
        continue
      }

      expect(project.blocks.length).toBeGreaterThan(0)
      for (const block of project.blocks) {
        expect(blockTypes.has(block.type)).toBe(true)
        if (block.type === "image") expect(fs.existsSync(path.join(process.cwd(), "public", block.src))).toBe(true)
      }
    }
  })
})
