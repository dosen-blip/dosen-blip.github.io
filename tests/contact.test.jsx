import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContactPage from "../src/pages/ContactPage"

const successMessage = "Thanks—your message has been sent."
const failureMessage = "Message could not be sent. Please try again or email matiadosen@outlook.com."
const defaultEndpoint = "https://formsubmit.co/ajax/matiadosen@outlook.com"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("contact page", () => {
  it("preserves the frozen copy, fields, and external links", () => {
    render(<ContactPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Let's Connect!" })).toBeInTheDocument()
    expect(screen.getByText("Available for Work")).toBeInTheDocument()
    expect(screen.getByText("matiadosen@outlook.com").closest("a")).toBeNull()
    expect(screen.getByLabelText("Name")).toHaveAttribute("name", "Name")
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Message")).toHaveAttribute("placeholder", "Write a message...")
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://www.instagram.com/matia_dosen/")
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/matia-dosen-719090273")
  })

  it("enables submission using the configured default email endpoint", () => {
    render(<ContactPage />)

    expect(screen.getByRole("button", { name: "Send Message" })).toBeEnabled()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("posts every visitor input to the default email endpoint and reports success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ContactPage />)

    await user.type(screen.getByLabelText("Name"), "Matia Dosen")
    await user.type(screen.getByLabelText("Email"), "matia@example.com")
    await user.type(screen.getByLabelText("Message"), "Hello there")
    await user.click(screen.getByRole("button", { name: "Send Message" }))

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(defaultEndpoint)
    expect(options.method).toBe("POST")
    expect(options.headers).toEqual({ Accept: "application/json" })
    expect(Object.fromEntries(options.body.entries())).toEqual({
      Name: "Matia Dosen",
      Email: "matia@example.com",
      Message: "Hello there",
      _subject: "New portfolio contact",
      _template: "table",
      _honey: "",
      _replyto: "matia@example.com",
    })
    expect(await screen.findByRole("status")).toHaveTextContent(successMessage)
  })

  it("supports a future endpoint override", async () => {
    vi.stubEnv("VITE_CONTACT_ENDPOINT", "https://forms.example/contact")
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ContactPage />)

    await user.type(screen.getByLabelText("Name"), "Matia")
    await user.type(screen.getByLabelText("Email"), "matia@example.com")
    await user.type(screen.getByLabelText("Message"), "Hello")
    await user.click(screen.getByRole("button", { name: "Send Message" }))

    expect(fetchMock).toHaveBeenCalledWith(
      "https://forms.example/contact",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("uses native required and email validation before submitting", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ContactPage />)

    await user.type(screen.getByLabelText("Name"), "Matia")
    await user.type(screen.getByLabelText("Email"), "not-an-email")
    await user.click(screen.getByRole("button", { name: "Send Message" }))

    expect(screen.getByLabelText("Email")).toBeInvalid()
    expect(screen.getByLabelText("Message")).toBeInvalid()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reports the approved failure copy for a rejected response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false })
    const user = userEvent.setup()
    render(<ContactPage />)

    await user.type(screen.getByLabelText("Name"), "Matia Dosen")
    await user.type(screen.getByLabelText("Email"), "matia@example.com")
    await user.type(screen.getByLabelText("Message"), "Hello there")
    await user.click(screen.getByRole("button", { name: "Send Message" }))

    expect(await screen.findByRole("status")).toHaveTextContent(failureMessage)
  })
})
