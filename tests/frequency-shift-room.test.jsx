import fs from "node:fs"
import path from "node:path"
import { cleanup, render, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FrequencyShiftDetail } from "../src/components/FrequencyShiftDetail"
import frequencyShift from "../src/data/projectRecords/frequency-shift"

const mount = vi.hoisted(() => vi.fn())
vi.mock("../src/scenes/laser-room/caseStudy.js", () => ({ mountCaseStudyRoom: mount }))

afterEach(() => {
  cleanup()
  mount.mockReset()
  delete window.WebGL2RenderingContext
})

const renderPage = () => render(<MemoryRouter><FrequencyShiftDetail project={frequencyShift} /></MemoryRouter>)

describe("Frequency Shift laser room", () => {
  it("keeps the photograph when the room can't run (no WebGL2)", async () => {
    const { container } = renderPage()
    const page = container.querySelector(".frequency-shift-page")

    await waitFor(() => expect(page).toHaveAttribute("data-room", "still"))
    expect(container.querySelector(".fs-hero-image")).toBeTruthy()
    expect(container.querySelector(".fs-room-stage")).toHaveAttribute("aria-hidden", "true")
    expect(mount).not.toHaveBeenCalled()
  })

  it("puts the site's room behind the page, lit from the page's own wordmark, and takes it down with the page", async () => {
    window.WebGL2RenderingContext = function WebGL2RenderingContext() {}
    const destroy = vi.fn()
    let signal
    mount.mockImplementation(async (stage, options) => {
      signal = options.signal
      options.onStart()
      return { destroy, relayout() {} }
    })

    const { container, unmount } = renderPage()
    const page = container.querySelector(".frequency-shift-page")

    await waitFor(() => expect(page).toHaveAttribute("data-room", "live"))
    expect(container.querySelector(".fs-hero-image")).toBeNull()
    const [stage, options] = mount.mock.calls[0]
    expect(stage).toBe(container.querySelector(".fs-room-stage"))
    expect(options.page).toBe(page)
    // the wordmark stays the page's own: the room only takes its light from where it is
    expect(options.wordmark).toBe(container.querySelector("h1.fs-hero-neon-wordmark"))
    expect(options.artwork).toBe("/assets/frequency-shift/mobile-fs-wordmark.svg")

    unmount()
    expect(signal.aborted).toBe(true)
    expect(destroy).toHaveBeenCalled()
  })

  it("leaves the letters to the page and brings no FS monogram into the room", () => {
    const caseStudy = fs.readFileSync(path.join(process.cwd(), "src/scenes/laser-room/caseStudy.js"), "utf8")
    const scene = fs.readFileSync(path.join(process.cwd(), "src/scenes/laser-room/scene.ts"), "utf8")

    expect(caseStudy).toContain("neon: false")
    expect(caseStudy).toContain("monogram: false")
    // the unseen sign stays behind the page's wordmark as the page scrolls, and the rig belongs to the room
    expect(caseStudy).toMatch(/follow: \(\) => \(\{ x: mark\.x, y: mark\.y - scrollY/)
    expect(caseStudy).toContain("rigCentre: true")
    expect(scene).toContain("for (const b of bays) followPage(b)")
    expect(caseStudy).not.toContain("fs-icon")
    expect(scene).toContain("layers.sign && opts.neon !== false")
    for (const file of ["floor-albedo", "floor-surface", "floor-albedo-phone", "floor-surface-phone"]) {
      expect(fs.existsSync(path.join(process.cwd(), `public/assets/frequency-shift/laser-room/${file}.webp`))).toBe(true)
    }
  })
})
