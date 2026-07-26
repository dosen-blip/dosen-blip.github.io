import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import NotFoundPage from "../src/pages/NotFoundPage"

describe("not found page", () => {
  it("renders the frozen 404 copy and links home", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument()
    expect(screen.getByText("OOPS!")).toBeInTheDocument()
    expect(screen.getByText("The page you are looking for wasn't found!")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go Back Home" })).toHaveAttribute("href", "/")
  })
})
