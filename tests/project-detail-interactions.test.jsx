import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { ProjectDetail } from "../src/components/ProjectDetail"
import animatic from "../src/data/projectRecords/animatic-remastered"

afterEach(cleanup)

describe("project detail interactions", () => {
  it("switches the YouTube poster to a privacy-enhanced player without autoplay", () => {
    render(<MemoryRouter><ProjectDetail project={animatic} /></MemoryRouter>)
    expect(screen.queryByTitle("Youtube Video")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Play Youtube Video" }))
    const frame = screen.getByTitle("Youtube Video")
    expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/fSDhwuEcBgQ")
    expect(frame.getAttribute("src")).not.toContain("autoplay")
  })

  it("renders published metadata and hides absent date/live links", () => {
    render(<MemoryRouter><ProjectDetail project={animatic} /></MemoryRouter>)
    expect(screen.getByText("Algonquin College")).toBeInTheDocument()
    expect(screen.getByText("1 Week")).toBeInTheDocument()
    expect(screen.queryByText("Date")).not.toBeInTheDocument()
    expect(screen.queryByText("Live Website")).not.toBeInTheDocument()
  })
})
