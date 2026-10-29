import { cleanup, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { InstinctDetail } from "../src/components/InstinctDetail"
import { ProjectCard } from "../src/components/ProjectCard"
import instinctGroove from "../src/data/projectRecords/instinct-groove"
import { projectIndex } from "../src/data/projectIndex"

afterEach(cleanup)

describe("Instinct Groove project page", () => {
  it("follows the Frequency Shift hero: kicker, wordmark, dek and meta over the wall", () => {
    const { container, getByRole } = render(
      <MemoryRouter><InstinctDetail project={instinctGroove} /></MemoryRouter>,
    )

    expect(getByRole("heading", { level: 1, name: "Instinct Groove" })).toBeTruthy()
    const hero = container.querySelector(".ig-hero")
    const copy = hero.querySelector(".ig-hero-copy")
    expect([...copy.children].map((node) => node.className)).toEqual(["ig-hero-kicker", "ig-hero-wordmark", "ig-hero-dek"])
    expect(hero.querySelector(".ig-scene")).toBeTruthy()
    expect([...hero.querySelectorAll(".ig-hero-meta dt")].map((node) => node.textContent)).toEqual(["Role", "Platform", "Output", "Period"])
    expect(container.querySelector('a[href="https://instinctgroove.com/"]')).toBeTruthy()
  })

  it("tells the build in one section under the hero, then hands over to related work", () => {
    const { container, getByRole } = render(
      <MemoryRouter><InstinctDetail project={instinctGroove} /></MemoryRouter>,
    )

    expect([...container.querySelectorAll(".ig-section")].map((node) => node.classList[1])).toEqual(["ig-build", "ig-related"])
    expect(getByRole("heading", { level: 2, name: "The poster, rebuilt as a room." })).toBeTruthy()
    expect(container.querySelector(".ig-build .ig-build-link")).toHaveAttribute("href", instinctGroove.liveUrl)
    expect(container).not.toHaveTextContent(/lorem ipsum/i)
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
