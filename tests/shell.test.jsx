import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { SiteShell } from "../src/components/SiteShell"

afterEach(cleanup)

describe("mobile navigation", () => {
  it("renders the DOSEN icon swap and current external destination", () => {
    render(<MemoryRouter><SiteShell><p>Page</p></SiteShell></MemoryRouter>)
    const links = screen.getAllByRole("link", { name: "Visit DOSEN" })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "https://dosen.ca")
    expect(links[0]).toHaveAttribute("target", "_blank")
    expect(links[0].querySelector(".dosen-icon-disco")).toBeInTheDocument()
    expect(links[0].querySelector(".dosen-icon-disco-filled")).toBeInTheDocument()
    expect(links[0].querySelector(".dosen-wordmark-outline")).toHaveAttribute("src", "/assets/8w0l0Gui033mioUQjzI6JOUa6f4.png")
    expect(links[0].querySelector(".dosen-wordmark-filled")).toHaveAttribute("src", "/assets/LRpJWtcLJyxTvUVMYNlxsHXRA.png")
  })

  it("opens, locks scrolling, closes with Escape, and restores focus", () => {
    render(<MemoryRouter><SiteShell><p>Page</p></SiteShell></MemoryRouter>)
    const button = screen.getByRole("button", { name: "Open menu" })
    fireEvent.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(document.documentElement).toHaveClass("menu-open")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(document.documentElement).not.toHaveClass("menu-open")
    expect(button).toHaveFocus()
  })
})
