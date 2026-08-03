import fs from "node:fs"
import path from "node:path"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { FrequencyShiftDetail } from "../src/components/FrequencyShiftDetail"
import frequencyShift from "../src/data/projectRecords/frequency-shift"
import HomePage from "../src/pages/HomePage"

afterEach(cleanup)

describe("Frequency Shift project page", () => {
  it("uses one scoped cinematic motion language without the old view-timeline layer", () => {
    const component = fs.readFileSync(path.join(process.cwd(), "src/components/FrequencyShiftDetail.jsx"), "utf8")
    const styles = fs.readFileSync(path.join(process.cwd(), "src/styles/frequency-shift.css"), "utf8")
    const cardStyles = fs.readFileSync(path.join(process.cwd(), "src/styles/layout-v2.css"), "utf8")
    const wordmark = fs.readFileSync(path.join(process.cwd(), "public/assets/frequency-shift/mobile-fs-wordmark.svg"), "utf8")

    expect(component).not.toContain('from "./Reveal"')
    expect(styles).not.toContain("animation-timeline")
    expect(styles).not.toContain("will-change")
    expect(styles).not.toContain("fs-hero-breathe")
    expect(styles).toContain("fs-hero-neon-layer-ambient")
    expect(styles).toContain("fs-neon-hover")
    expect(cardStyles).toContain(".project-card-frequency-shift .project-card-media .frequency-shift-card-logo-layer")
    expect(cardStyles).toContain("blur(2.2rem) saturate(1.5)")
    expect(cardStyles).toContain("drop-shadow(0 0 1.8rem rgba(197, 72, 240, .78))")
    expect(cardStyles).toContain("brightness(1.36)")
    expect(cardStyles).toContain("drop-shadow(0 0 1.45rem rgba(197, 72, 240, .58))")
    expect(cardStyles).toContain("frequency-shift-card-tube-flicker 820ms")
    expect(wordmark).toContain("@keyframes fs-neon-ignite")
    expect(wordmark).toContain("1.92s linear var(--ignite-delay)")
    expect(wordmark).toContain("--ignite-delay: 315ms")
    expect(wordmark).toContain("prefers-reduced-motion: reduce")
  })

  it("prioritizes creative and operational leadership before the supplementary DJ role", () => {
    const { container, getByRole, getByText } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    expect(getByRole("heading", { level: 1, name: "Frequency Shift" })).toBeTruthy()
    expect(container.querySelector('.fs-hero-neon-asset[src="/assets/frequency-shift/mobile-fs-wordmark.svg"]')).toBeTruthy()
    expect(container).toHaveTextContent("Web Development / Video Editing")
    expect(getByText(/I shape Frequency Shift from first announcement to final archive/i)).toBeTruthy()
    expect(getByRole("heading", { name: "A visual system built to move between rooms." })).toBeTruthy()
    expect(getByRole("heading", { name: "A permanent home for a moving series." })).toBeTruthy()

    const djAside = container.querySelector(".fs-dj-aside")
    expect(djAside).toHaveTextContent("Supplementary / DJ")
    expect(djAside).toHaveTextContent("I also play selected Frequency Shift nights")
    expect(container.querySelector(".fs-room").compareDocumentPosition(djAside)).toBe(
      Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it("uses only the two supplied local video masters with no pending media card", () => {
    const { container } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    expect(container.querySelectorAll(".fs-motion-card")).toHaveLength(2)
    expect(container.querySelectorAll(".fs-motion-card-pending")).toHaveLength(0)
    const videos = [...container.querySelectorAll("video")]
    expect(videos).toHaveLength(2)
    expect(videos.map((video) => video.getAttribute("src"))).toEqual([
      "/assets/frequency-shift/video/frequency-shift-gridwrks-master.mov",
      "/assets/frequency-shift/video/frequency-shift-solstice-city-at-night-master.mov",
    ])
    for (const video of videos) {
      expect(video.controls).toBe(true)
      expect(video.autoplay).toBe(false)
      expect(video.playsInline).toBe(true)
      expect(video.getAttribute("preload")).toBe("none")
      expect(video.getAttribute("poster")).toMatch(/^\/assets\/frequency-shift\/video\/.+-poster\.jpg$/)
    }
    expect(container).toHaveTextContent("Frequency Shift at GRIDWRKS")
    expect(container).toHaveTextContent("Frequency Shift × Solstice")
    expect(container).toHaveTextContent("City At Night")
    expect(container).not.toHaveTextContent("frequency-shift-gridwrks-master.mov")
    expect(container).not.toHaveTextContent("frequency-shift-solstice-city-at-night-master.mov")
    expect(container).not.toHaveTextContent("frequency-shift-flagship-film.mp4")
    expect(container).not.toHaveTextContent("Master incoming")
    expect(container).not.toHaveTextContent("Flagship film")
    expect(container).not.toHaveTextContent("Next master")

    fireEvent.error(videos[0])
    expect(container).toHaveTextContent("This browser may not support the original HEVC master.")
    expect(container.querySelector('a[href="https://frequencyshift.ca/archive/frequency-shift-005/"]')).toBeTruthy()
  })

  it("shows five venue-photography posts with visible source credits and no posters", () => {
    const { container } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    expect(container.querySelector(".fs-proof-strip")).toBeNull()
    expect(container.querySelectorAll(".fs-campaign-card")).toHaveLength(5)
    expect(container.querySelectorAll(".fs-campaign-rail a")).toHaveLength(5)
    expect(container.querySelectorAll('.fs-campaign-media img[loading="lazy"][decoding="async"]')).toHaveLength(5)
    expect(container).toHaveTextContent("05 venue recaps")
    expect(container).toHaveTextContent("Photo: Catherine Archambault")
    expect(container).toHaveTextContent("Photo: Blue Chapel Lamb")
    expect(container).toHaveTextContent("Photo: Mystic Does Media")
    expect(container).toHaveTextContent("Photo credit not listed")
    expect(container.querySelector('a[href="https://www.instagram.com/p/Das9FdvCfZt/"]')).toBeTruthy()
    expect(container.querySelector('a[href="https://www.instagram.com/p/DKe8HNiOT1M/"]')).toBeTruthy()
    expect(container.querySelector('a[href="https://www.instagram.com/p/DNEDMbduITH/"]')).toBeTruthy()
    expect(container.querySelector('a[href="https://www.instagram.com/p/DaBDdIyjhBX/"]')).toBeTruthy()
    expect(container.querySelector('a[href="https://www.instagram.com/p/DWUtWzUjo6R/"]')).toBeTruthy()
    expect(container.querySelectorAll('.fs-campaign-media img[src*="/campaign/"]')).toHaveLength(0)
    expect(container).not.toHaveTextContent("Selected campaign assets incoming")
  })

  it("uses the canonical site, lazy below-fold media, and visible credits", () => {
    const { container } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    const heroImage = container.querySelector(".fs-hero-image")
    expect(heroImage).toHaveAttribute("loading", "eager")
    expect(heroImage).toHaveAttribute("fetchpriority", "high")
    expect(container.querySelectorAll('.fs-web-browser img[loading="lazy"]')).toHaveLength(1)
    expect(container.querySelectorAll('.fs-campaign-media img[loading="lazy"][decoding="async"]')).toHaveLength(5)
    expect(container.querySelectorAll(".fs-photo")).toHaveLength(0)
    expect(container).toHaveTextContent("Photo: Catherine Archambault")
    expect(container).toHaveTextContent("Photo: Mystic Does Media")
    expect(container).toHaveTextContent("Photo: Blue Chapel Lamb")
    expect(container.querySelector('a[href="https://frequencyshift.ca/"]')).toBeTruthy()
    expect(container).toHaveTextContent("frequencyshift.ca")
    expect(container.innerHTML).not.toContain("matiadosen.com/Frequency-Shift")
    expect(container.querySelector('a[href="https://www.instagram.com/frequency___shift/"]')).toBeTruthy()
    expect(container.querySelectorAll(".fs-related-card")).toHaveLength(3)
    expect(container.querySelector('.fs-related-card[href="/projects/video-production"]')).toBeTruthy()
  })
})

describe("Frequency Shift portfolio placement", () => {
  it("keeps HintonX featured and makes Frequency Shift a secondary homepage project", () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>)
    const projects = [...container.querySelectorAll(".home-project-card")]

    expect(projects).toHaveLength(3)
    expect(projects[0]).toHaveClass("home-project-featured")
    expect(projects[0]).toHaveTextContent("Video Production at HintonX")
    expect(projects[1]).toHaveTextContent("Frequency Shift")
    expect(projects[1]).toHaveClass("project-card-frequency-shift")
    expect(projects[1].querySelector('.frequency-shift-card-backdrop[src="/assets/frequency-shift/hero-crowd.webp"]')).toBeTruthy()
    expect(projects[1].querySelectorAll('.frequency-shift-card-logo-layer[src="/assets/frequency-shift/fs-icon-vector.svg"]')).toHaveLength(3)
    expect(projects[2]).toHaveTextContent("Trendless")
    expect(container).not.toHaveTextContent("Animatic Remastered")
  })
})
