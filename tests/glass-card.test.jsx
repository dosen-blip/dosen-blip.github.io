import { createRef } from "react"
import { renderToString } from "react-dom/server"
import { MemoryRouter, Link } from "react-router-dom"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import GlassCard from "../src/components/GlassCard"
import GlassFolder from "../src/components/GlassFolder"
import { glassLooks } from "../src/data/glassLooks"

afterEach(cleanup)

describe("GlassCard", () => {
  it("renders a div with the children above the folder's layers, in order", () => {
    const { container } = render(<GlassCard><p>Inside</p></GlassCard>)
    const root = container.firstElementChild
    expect(root.tagName).toBe("DIV")
    expect(root).toHaveClass("gc")
    expect(root).toHaveAttribute("data-look", "motion")
    expect(root).toHaveAttribute("data-tone", "dark")
    expect(screen.getByText("Inside").parentElement).toBe(root)

    const layers = root.querySelector(".gc-layers")
    expect(layers).toHaveAttribute("aria-hidden", "true")
    expect([...layers.children].map((layer) => layer.classList[layer.classList.length - 1])).toEqual([
      "gc-art",
      "gf-back-sheen",
      "gc-frost",
      "gc-tint",
      "gf-spec",
      "gc-glow",
      "gc-rim",
    ])
    expect(layers.nextElementSibling).toBe(screen.getByText("Inside"))
  })

  it.each(Object.keys(glassLooks))("takes its tone from the %s look", (look) => {
    const { container } = render(<GlassCard look={look} />)
    expect(container.firstElementChild).toHaveAttribute("data-look", look)
    expect(container.firstElementChild).toHaveAttribute("data-tone", glassLooks[look].tone)
  })

  it("falls back to the motion look for an unknown look", () => {
    const { container } = render(<GlassCard look="nope" />)
    expect(container.firstElementChild).toHaveAttribute("data-look", "motion")
  })

  it("renders as the element or component it is given", () => {
    const anchor = render(<GlassCard as="a" href="/web">Web</GlassCard>)
    expect(anchor.container.firstElementChild.tagName).toBe("A")
    expect(anchor.container.firstElementChild).toHaveAttribute("href", "/web")

    const link = render(<MemoryRouter><GlassCard as={Link} to="/ux">UX</GlassCard></MemoryRouter>)
    expect(link.container.firstElementChild.tagName).toBe("A")
    expect(link.container.firstElementChild).toHaveAttribute("href", "/ux")
    expect(link.container.firstElementChild).toHaveClass("gc")
  })

  it("passes other props, a class name and a ref to the root", () => {
    const ref = createRef()
    const onClick = vi.fn()
    const { container } = render(
      <GlassCard ref={ref} className="about-card" id="card" data-kind="note" aria-label="Note" onClick={onClick} />,
    )
    const root = container.firstElementChild
    expect(ref.current).toBe(root)
    expect(root).toHaveClass("gc", "about-card")
    expect(root).toHaveAttribute("id", "card")
    expect(root).toHaveAttribute("data-kind", "note")
    expect(root).toHaveAttribute("aria-label", "Note")
    fireEvent.click(root)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("renders on the server with a blank canvas waiting for the art", () => {
    const html = renderToString(<GlassCard look="web"><p>Server</p></GlassCard>)
    expect(html).toContain("Server")
    expect(html).toContain("<canvas")
    expect(html).not.toContain("data-ready")
  })

  it("does not start painting without canvas support", () => {
    const spy = vi.spyOn(window, "requestAnimationFrame")
    render(<GlassCard look="ux" />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe("GlassFolder link key", () => {
  const folder = (props) => render(<GlassFolder label="Web" files={[]} action="link" {...props} />)

  it("is a real link with the arrow, its label and no menu", () => {
    const { container } = folder({ link: { label: "All web projects", href: "/web" } })
    const key = screen.getByRole("link", { name: "All web projects" })
    expect(key).toHaveAttribute("href", "/web")
    expect(key).toHaveClass("gf-key", "gf-key--link")
    expect(key.querySelector("path")).toHaveAttribute("d", "M5 12h14M14 7l5 5-5 5")
    expect(container.querySelector("[role=menu]")).toBeNull()
    expect(container.querySelector(".gf-key--more")).toBeNull()
    expect(screen.queryByRole("button", { name: /More options/ })).toBeNull()
  })

  it("calls onSelect and leaves the folder as it was", () => {
    const onSelect = vi.fn((event) => event.preventDefault())
    const onOpenChange = vi.fn()
    const { container } = folder({ link: { label: "All web projects", href: "/web", onSelect }, onOpenChange })
    fireEvent.click(screen.getByRole("link", { name: "All web projects" }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(container.querySelector(".gf-root")).not.toHaveAttribute("data-open")
  })

  it("closes an open folder on Escape, and not on a press on the key", () => {
    const onOpenChange = vi.fn()
    folder({ link: { label: "All web projects", href: "/web" }, defaultOpen: true, onOpenChange })
    fireEvent.pointerDown(screen.getByRole("link", { name: "All web projects" }))
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes an open folder on a press outside", () => {
    const onOpenChange = vi.fn()
    folder({ link: { label: "All web projects", href: "/web" }, defaultOpen: true, onOpenChange })
    fireEvent.pointerDown(document.body)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("still adds files with the add key", () => {
    const { container } = render(<GlassFolder label="Web" files={[]} meta="" action="add" />)
    fireEvent.click(screen.getByRole("button", { name: "Add a file to Web" }))
    expect(container.querySelectorAll(".gf-sheet")).toHaveLength(1)
  })
})
