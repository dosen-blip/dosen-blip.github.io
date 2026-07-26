import { cleanup, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import HomePage from "../src/pages/HomePage"

afterEach(cleanup)

const expectedStack = [
  "Framer",
  "Figma",
  "OpenAI Codex",
  "Claude Code",
  "Adobe Creative Suite",
  "Ableton Live Suite",
  "Local LLM Environments",
  "Retrieval & Evaluation",
]

describe("home working stack", () => {
  it("shows the eight selected design, development, and AI capabilities", () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>)
    const cards = [...container.querySelectorAll(".home-stack-card")]

    expect(cards.map((card) => card.querySelector("strong").textContent)).toEqual(expectedStack)
    expect(cards.every((card) => card.getAttribute("href")?.startsWith("https://"))).toBe(true)
    expect(new Set(cards.map((card) => card.getAttribute("href"))).size).toBe(cards.length)
  })
})
