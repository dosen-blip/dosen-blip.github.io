import { cleanup, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import HomePage from "../src/pages/HomePage"

afterEach(cleanup)

const expectedStack = [
  "Figma",
  "Adobe Creative Suite",
  "Framer",
  "Ableton Live Suite",
  "Blender",
  "Claude Code",
  "OpenAI Codex",
  "Local LLM Environments",
]

describe("home working stack", () => {
  it("shows eight tools, design and production first", () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>)
    const cards = [...container.querySelectorAll(".home-stack-card")]

    expect(cards.map((card) => card.querySelector("strong").textContent)).toEqual(expectedStack)
    expect(cards.every((card) => card.getAttribute("href")?.startsWith("https://"))).toBe(true)
    expect(new Set(cards.map((card) => card.getAttribute("href"))).size).toBe(cards.length)
  })
})
