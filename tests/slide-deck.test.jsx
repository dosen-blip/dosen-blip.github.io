import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { ProjectDetail } from "../src/components/ProjectDetail"
import { SlideDeck } from "../src/components/SlideDeck"
import { beatportDeck, trendlessDeck } from "../src/data/decks"
import beatport from "../src/data/projectRecords/beatport-redesign"
import trendless from "../src/data/projectRecords/trendless"

afterEach(cleanup)

describe("slide deck", () => {
  it("steps through slides with the arrows, the keyboard and the thumbnails", () => {
    const { container } = render(<SlideDeck deck={beatportDeck} label="Beatport deck" />)
    const slide = () => container.querySelector(".deck-slide")
    expect(slide()).toHaveAttribute("src", beatportDeck.slides[0].src)
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(slide()).toHaveAttribute("src", beatportDeck.slides[1].src)

    fireEvent.keyDown(container.querySelector(".deck"), { key: "End" })
    expect(slide()).toHaveAttribute("src", beatportDeck.slides.at(-1).src)
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Slide 7" }))
    expect(slide()).toHaveAttribute("src", beatportDeck.slides[6].src)
    expect(screen.getByRole("button", { name: "Slide 7" })).toHaveAttribute("aria-current", "true")
    expect(slide().getAttribute("alt")).toContain("Home")
    expect(screen.getByRole("link", { name: "PDF" })).toHaveAttribute("href", beatportDeck.pdf)
  })

  it("leads the Beatport page with the deck and the prototype video, and Trendless with its 2.0 deck", () => {
    const { container, unmount } = render(<MemoryRouter><ProjectDetail project={beatport} /></MemoryRouter>)
    const blocks = [...container.querySelectorAll(".detail-features .media-block")]
    expect(blocks).toHaveLength(2)
    expect(blocks[0].querySelectorAll(".deck-thumb")).toHaveLength(beatportDeck.slides.length)
    const video = blocks[1].querySelector("video")
    expect(video).toHaveAttribute("src", "/assets/projects/beatport/prototype-demo.mp4")
    expect(video.controls).toBe(true)
    expect(video.autoplay).toBe(false)
    expect(video.getAttribute("preload")).toBe("none")
    expect(container).toHaveTextContent("unofficial student concept")
    unmount()

    const trendlessView = render(<MemoryRouter><ProjectDetail project={trendless} /></MemoryRouter>)
    expect(trendlessView.container.querySelectorAll(".deck-thumb")).toHaveLength(trendlessDeck.slides.length)
  })
})
