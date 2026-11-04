import { MemoryRouter } from "react-router-dom"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import AboutPage from "../src/pages/AboutPage"
import { DOSEN_URL } from "../src/data/site"

afterEach(cleanup)

function renderAbout() {
  return render(<MemoryRouter><AboutPage /></MemoryRouter>)
}

function cardFor(title) {
  return screen.getByRole("heading", { level: 2, name: title }).closest(".about-card")
}

describe("AboutPage", () => {
  it("opens with what, then who for: HintonX, Hinton Publishing, Frequency Shift", () => {
    const { container } = renderAbout()
    expect(container.querySelector(".lede").textContent).toBe(
      "I design and build websites and apps, and film and edit video. I’ve worked at HintonX on apps, books and film since 2019, co-own Hinton Publishing, where I design and typeset sports books, and lead creative direction for Frequency Shift, an Ottawa house music series.",
    )
  })

  it("has the Contact button and no availability pill in the hero", () => {
    const { container } = renderAbout()
    const hero = container.querySelector(".about-hero")
    expect(within(hero).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact")
    expect(screen.queryByText("Available for work")).toBeNull()
  })

  it("gives Education no link and no View work link anywhere", () => {
    renderAbout()
    expect(screen.queryByRole("link", { name: /view work/i })).toBeNull()
    expect(within(cardFor("Education")).queryByRole("link")).toBeNull()
  })

  it("links Tools to /stack and Music to dosen.ca in a new tab", () => {
    renderAbout()
    expect(within(cardFor("Tools")).getByRole("link", { name: "All tools" })).toHaveAttribute("href", "/stack")
    const dosen = within(cardFor("Music")).getByRole("link", { name: "dosen.ca" })
    expect(dosen).toHaveAttribute("href", DOSEN_URL)
    expect(dosen).toHaveAttribute("target", "_blank")
  })

  it("makes the three cards glass, one of each look", () => {
    renderAbout()
    expect(cardFor("Education")).toHaveAttribute("data-look", "web")
    expect(cardFor("Tools")).toHaveAttribute("data-look", "ux")
    expect(cardFor("Music")).toHaveAttribute("data-look", "motion")
  })
})
