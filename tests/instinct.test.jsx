import { cleanup, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { InstinctDetail } from "../src/components/InstinctDetail"
import { ProjectCard } from "../src/components/ProjectCard"
import instinctGroove from "../src/data/projectRecords/instinct-groove"
import { projectIndex } from "../src/data/projectIndex"

afterEach(cleanup)

describe("Instinct Groove project page", () => {
  it("is the wall: kicker, wordmark and dek over it, a way back and to the live site", () => {
    const { container, getByRole } = render(
      <MemoryRouter><InstinctDetail project={instinctGroove} /></MemoryRouter>,
    )

    expect(getByRole("heading", { level: 1, name: "Instinct Groove" })).toBeTruthy()
    const hero = container.querySelector(".ig-hero")
    const copy = hero.querySelector(".ig-hero-copy")
    expect([...copy.children].map((node) => node.className)).toEqual(["ig-hero-wordmark", "ig-hero-dek"])
    expect(hero.querySelector(".ig-scene")).toBeTruthy()
    expect(container.querySelector('a[href="https://instinctgroove.com/"]')).toBeTruthy()
  })

  it("has only one line under the dek, on more of the wall, and sends you to the site from the top", () => {
    const { container, getAllByRole } = render(
      <MemoryRouter><InstinctDetail project={instinctGroove} /></MemoryRouter>,
    )

    const page = container.querySelector(".instinct-page")
    expect([...page.children].map((node) => node.className)).toEqual(["ig-hero"])
    const more = page.querySelector(".ig-hero > .ig-hero-more")
    expect(more).toHaveTextContent(/^I designed and built the website\.$/)
    expect(more.querySelector("a")).toBeNull()
    const links = getAllByRole("link", { name: /Visit site/ })
    expect(links.length).toBe(1)
    expect(links[0]).toHaveAttribute("href", instinctGroove.liveUrl)
    expect(container.querySelector(".ig-hero-topline")).toContainElement(links[0])
  })

  it("letters the wordmark over the baked still when the live scene can't run", () => {
    // the test setup reports reduced motion, which keeps the WebGL scene off
    const { container } = render(
      <MemoryRouter><InstinctDetail project={instinctGroove} /></MemoryRouter>,
    )

    expect(container.querySelector(".ig-hero").dataset.scene).toBe("still")
    expect(container.querySelector(".ig-hero-still").getAttribute("src")).toBe(instinctGroove.content.hero.still)
    expect(container.querySelector("canvas")).toBeNull()
  })

  it("gives its project card the layered plates of the scene", () => {
    const card = projectIndex.find((project) => project.slug === "instinct-groove")
    const { container } = render(<MemoryRouter><ProjectCard project={card} /></MemoryRouter>)

    expect(container.querySelector(".project-card-instinct")).toBeTruthy()
    expect([...container.querySelectorAll(".ig-card-layer")].map((node) => node.getAttribute("src"))).toEqual([
      "/assets/instinct/card-room.webp",
      "/assets/instinct/card-sign.webp",
      "/assets/instinct/card-sign.webp",
    ])
    expect(container.querySelectorAll(".ig-card-fly").length).toBeGreaterThan(0)
  })
})
