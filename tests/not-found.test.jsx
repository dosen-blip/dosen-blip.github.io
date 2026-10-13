import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import NotFoundPage from "../src/pages/NotFoundPage"

describe("not found page", () => {
  it("renders the 404 copy and links home", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument()
    expect(screen.getByText("Page not found")).toBeInTheDocument()
    expect(screen.getByText("There is no page at this address.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/")
  })
})
