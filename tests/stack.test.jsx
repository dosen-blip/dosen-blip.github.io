import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import StackPage from "../src/pages/StackPage"

afterEach(cleanup)

const expectedGroups = [
  "Design & Development",
  "AI Systems & Agents",
  "Creative Production",
]

const expectedAiCapabilities = [
  "OpenAI Codex",
  "Claude Code",
  "Local LLM Environments",
  "Retrieval & Evaluation",
  "Agent Workflow Design",
  "AI Research & Reasoning",
]

describe("stack page", () => {
  it("organizes the expanded stack into three capability groups", () => {
    render(<StackPage />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tools become valuable when they become working systems")
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(expectedGroups)
    expect(screen.getAllByRole("link")).toHaveLength(13)
  })

  it("shows the complete applied AI capability set", () => {
    render(<StackPage />)
    const aiSection = screen.getByRole("region", { name: "AI Systems & Agents" })

    expect(within(aiSection).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(expectedAiCapabilities)
    expect(within(aiSection).getByText("LM Studio")).toBeInTheDocument()
    expect(within(aiSection).getByText("RAG")).toBeInTheDocument()
    expect(within(aiSection).getByText("Multi-Agent")).toBeInTheDocument()
    expect(aiSection.querySelectorAll(".stack-card-heading img")).toHaveLength(6)
  })

  it("preserves the existing design and creative-production skills", () => {
    render(<StackPage />)
    const names = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)

    expect(names).toEqual(expect.arrayContaining([
      "Framer",
      "Figma",
      "Adobe Creative Suite",
      "Frontend Systems",
      "Topaz AI Suite",
      "Ableton Live Suite",
      "Blender",
    ]))
  })

  it("uses distinct official resources and opens every card in a new tab", () => {
    render(<StackPage />)
    const links = screen.getAllByRole("link")

    expect(new Set(links.map((link) => link.getAttribute("href"))).size).toBe(links.length)
    for (const link of links) {
      expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\//))
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
    }
  })
})
