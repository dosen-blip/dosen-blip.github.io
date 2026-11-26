import fs from "node:fs"
import path from "node:path"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FrequencyShiftDetail } from "../src/components/FrequencyShiftDetail"
import frequencyShift from "../src/data/projectRecords/frequency-shift"
import HomePage from "../src/pages/HomePage"

afterEach(cleanup)

describe("Frequency Shift project page", () => {
  it("uses one scoped cinematic motion language without the old view-timeline layer", () => {
    const component = fs.readFileSync(path.join(process.cwd(), "src/components/FrequencyShiftDetail.jsx"), "utf8")
    const styles = fs.readFileSync(path.join(process.cwd(), "src/styles/frequency-shift.css"), "utf8")
    const cardStyles = fs.readFileSync(path.join(process.cwd(), "src/styles/fs-card.css"), "utf8")
    const wordmark = fs.readFileSync(path.join(process.cwd(), "public/assets/frequency-shift/mobile-fs-wordmark.svg"), "utf8")

    expect(component).not.toContain('from "./Reveal"')
    expect(styles).not.toContain("animation-timeline")
    expect(styles).not.toContain("will-change")
    expect(styles).not.toContain("fs-hero-breathe")
    expect(styles).toContain("fs-hero-neon-layer-ambient")
    expect(styles).toContain("fs-neon-hover")
    // the card art is the laser room, baked: the show plays over it and the sign powers on when pointed at
    expect(cardStyles).toContain(".fsc-art.is-playing video.fsc-show-video")
    expect(cardStyles).toContain("animation: fsc-power-on 1.1s linear both")
    expect(cardStyles).toContain("mix-blend-mode: plus-lighter")
    expect(styles).toContain("@keyframes fs-neon-power-core")
    expect(styles).toContain("fs-neon-power-core 1.92s")
    expect(styles).toContain("fs-neon-power-bloom 1.92s")
    expect(styles).toContain("fs-neon-power-ambient 1.92s")
    expect(wordmark).toContain("opacity: 1")
    expect(wordmark).not.toContain("@keyframes fs-neon-ignite")
  })

  it("lists the jobs up front and keeps DJing as a side note in the event section", () => {
    const { container, getByRole, getByText } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    expect(getByRole("heading", { level: 1, name: "Frequency Shift" })).toBeTruthy()
    expect(container.querySelector('.fs-hero-neon-asset[src="/assets/frequency-shift/mobile-fs-wordmark.svg"]')).toBeTruthy()
    expect(container).toHaveTextContent("Web Development / Video Editing")
    expect(getByText(/I’m on the team behind Frequency Shift/i)).toBeTruthy()
    expect(getByRole("heading", { name: "Same series, different nights." })).toBeTruthy()
    expect(getByRole("heading", { name: "A permanent home for a moving series." })).toBeTruthy()

    const djAside = container.querySelector(".fs-dj-aside")
    expect(djAside).toHaveTextContent("Also / DJ")
    expect(djAside).toHaveTextContent("I also DJ some of the nights")
    expect(container.querySelector(".fs-room").compareDocumentPosition(djAside)).toBe(
      Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it("opens with the video block and keeps the remaining sections in their original order", () => {
    const { container } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    const sections = [...container.querySelectorAll(".fs-section")]
    expect(sections.map((section) => section.className)).toEqual([
      "fs-section fs-motion",
      "fs-section fs-overview",
      "fs-section fs-creative",
      "fs-section fs-web",
      "fs-section fs-room",
      "fs-section fs-closing",
      "fs-section fs-related",
    ])
    expect(container.querySelector(".fs-hero + .fs-section")).toHaveClass("fs-motion")

    const motion = sections[0]
    const films = motion.querySelector(".fs-reel")
    expect(films.compareDocumentPosition(motion.querySelector("#fs-motion-title"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(motion).toHaveTextContent("01 / Motion and promotion")
    expect(sections[1]).toHaveTextContent("02 / The role")
    expect(sections[2]).toHaveTextContent("03 / The look")
  })

  it("runs every film through the reel as a silent copy, with a button that opens each one", () => {
    const { container, getByRole } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )

    expect(container.querySelectorAll(".fs-motion-card")).toHaveLength(0)
    const sources = [...container.querySelectorAll(".fs-reel-sources video")]
    expect(sources.map((video) => video.getAttribute("src"))).toEqual([
      "/assets/frequency-shift/video/reel/techno-special.mp4",
      "/assets/frequency-shift/video/reel/gridwrks.mp4",
      "/assets/frequency-shift/video/reel/this-friday.mp4",
      "/assets/frequency-shift/video/reel/solstice.mp4",
    ])
    for (const video of sources) {
      expect(video.muted).toBe(true)
      expect(video.controls).toBe(false)
      expect(video.playsInline).toBe(true)
      expect(video.getAttribute("preload")).toBe("none")
    }

    // Landscape and vertical alternate, and nothing plays until the live row has started.
    const shapes = frequencyShift.content.motion.slots.map((film) => film.aspectRatio)
    expect(shapes).toEqual(["16 / 9", "9 / 16", "16 / 9", "9 / 16"])
    expect(container.querySelector(".fs-reel")).toHaveAttribute("data-mode", "still")
    expect(container.querySelectorAll(".fs-reel-tile")).toHaveLength(4)
    expect(getByRole("button", { name: /Watch Frequency Shift × Solstice, City At Night/ })).toBeTruthy()
    expect(container).toHaveTextContent("Frequency Shift: Techno Special")
    expect(container).not.toHaveTextContent("frequency-shift-gridwrks-master.mov")
  })

  it("expands a film into a player with the master and sound, and falls back to the archive if it can't play", () => {
    const showModal = vi.fn()
    HTMLDialogElement.prototype.showModal = showModal
    HTMLDialogElement.prototype.close = vi.fn()
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())

    const { container, getByRole } = render(
      <MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>,
    )
    expect(container.querySelector(".fs-reel-player")).toBeNull()

    fireEvent.click(getByRole("button", { name: /Watch Frequency Shift: Techno Special/ }))
    expect(showModal).toHaveBeenCalledOnce()
    const player = container.querySelector(".fs-reel-player")
    const video = player.querySelector("video")
    expect(video.getAttribute("src")).toBe("/assets/frequency-shift/video/frequency-shift-techno-special-master.mp4")
    expect(video.controls).toBe(true)
    expect(video.muted).toBe(false)
    expect(video.playsInline).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()

    fireEvent.error(video)
    expect(player).toHaveTextContent("This browser could not play the original master.")
    expect(player.querySelector('a[href="https://frequencyshift.ca/events/september-4/"]')).toBeTruthy()

    fireEvent.click(player.querySelector(".fs-reel-close"))
    expect(container.querySelector(".fs-reel-player")).toBeNull()

    // The browser closing the dialog on its own clears the player the same way.
    fireEvent.click(getByRole("button", { name: /Watch Frequency Shift: This Friday/ }))
    fireEvent(container.querySelector(".fs-reel-player"), new Event("close"))
    expect(container.querySelector(".fs-reel-player")).toBeNull()
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
    // a window into the site's laser room: the room, two of the show's looks and the sign's light, baked from the scene
    for (const plate of ["card-base", "card-show", "card-sign"]) {
      expect(projects[1].querySelector(`.fsc-art img[src="/assets/frequency-shift/card/${plate}.webp"]`)).toBeTruthy()
    }
    // the moving show is a muted, looping video that loads only once the card is near the screen
    const show = projects[1].querySelector("video.fsc-show-video")
    expect(show.muted).toBe(true)
    expect(show).toHaveAttribute("loop")
    expect(show).toHaveAttribute("preload", "none")
    expect(show.getAttribute("src")).toBeNull()
    expect(fs.existsSync(path.join(process.cwd(), "public/assets/frequency-shift/card/card-show.mp4"))).toBe(true)
    // and the Web development folder's sheet is the same room, with the monogram up high
    expect(container.querySelector('.gf-sheet .fsc-art--sheet img[src="/assets/frequency-shift/card/sheet-base.webp"]')).toBeTruthy()
    expect(projects[2]).toHaveTextContent("Beatport Redesign")
    // Animatic sits in the Motion folder above, but not among the selected work.
    expect(container.querySelector(".home-work")).not.toHaveTextContent("Animatic Remastered")
  })
})
