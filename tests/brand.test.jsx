import { cleanup, render, screen, within } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { App } from "../src/App"
import { SiteShell } from "../src/components/SiteShell"
import { disciplineForPath, disciplines } from "../src/data/disciplines"
import { projectDisciplines, projectsFor } from "../src/data/projectIndex"
import DisciplinePage from "../src/pages/DisciplinePage"
import HomePage from "../src/pages/HomePage"

afterEach(cleanup)

function shellAt(path) {
  return render(<MemoryRouter initialEntries={[path]}><SiteShell><p>Page</p></SiteShell></MemoryRouter>)
}

describe("discipline routing", () => {
  it("maps pages and project pages to the discipline they cover", () => {
    expect(disciplineForPath("/web", projectDisciplines)).toBe("web")
    expect(disciplineForPath("/motion", projectDisciplines)).toBe("motion")
    expect(disciplineForPath("/ux", projectDisciplines)).toBe("ux")
    expect(disciplineForPath("/projects/trendless", projectDisciplines)).toBe("ux")
    expect(disciplineForPath("/projects/frequency-shift", projectDisciplines)).toBe("web")
    expect(disciplineForPath("/projects/novak-books", projectDisciplines)).toBeNull()
    expect(disciplineForPath("/about", projectDisciplines)).toBeNull()
    expect(disciplineForPath("/", projectDisciplines)).toBeNull()
  })
})

describe("site header", () => {
  it.each([
    ["/web", "web"],
    ["/motion", "motion"],
    ["/projects/video-production", "motion"],
    ["/ux", "ux"],
  ])("plays the %s splash on the header wordmark", (path, splash) => {
    const { container } = shellAt(path)
    const logo = container.querySelector(".header-logo .wordmark")
    expect(logo).toHaveAttribute("data-splash", splash)
    expect(logo).toHaveAttribute("aria-label", "matia dosen")
  })

  it("leaves the wordmark still where the page has no single discipline", () => {
    for (const path of ["/", "/about", "/contact", "/projects/novak-books"]) {
      const { container, unmount } = shellAt(path)
      expect(container.querySelector(".header-logo .wordmark")).not.toHaveAttribute("data-splash")
      unmount()
    }
  })

  it("carries Work, About and Contact, with Work current on discipline pages", () => {
    shellAt("/ux")
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual(["Work", "About", "Contact"])
    expect(within(nav).getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page")
  })

  it("ends every page on the end card with the email and the separate music link", () => {
    shellAt("/")
    const footer = screen.getByRole("contentinfo")
    expect(within(footer).getByRole("link", { name: /matiadosen@outlook\.com/ })).toHaveAttribute("href", "mailto:matiadosen@outlook.com")
    expect(within(footer).getByRole("link", { name: /DOSEN \(music\)/ })).toHaveAttribute("href", "https://dosen.ca")
  })
})

describe("home page", () => {
  it("leads with the name, then the three disciplines, then the work", () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Matia Dosen")
    expect(container.querySelector(".hero-descriptor")).toHaveTextContent("Web, Motion & UX designer.")

    const cards = [...container.querySelectorAll(".discipline-card")]
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(["/web", "/motion", "/ux"])
    expect(cards.map((card) => card.querySelector("source").getAttribute("src"))).toEqual([
      "/assets/brand/reveals/web-decode.mp4",
      "/assets/brand/reveals/motion-pen-tool.mp4",
      "/assets/brand/reveals/ux-responsive.mp4",
    ])
    for (const card of cards) expect(card.querySelector("button")).toBeNull()
  })
})

describe("discipline pages", () => {
  it.each(disciplines.map((discipline) => [discipline.id, discipline]))("%s opens on its reveal and lists its projects", (id, discipline) => {
    const { container } = render(<MemoryRouter><DisciplinePage id={id} /></MemoryRouter>)
    expect(screen.getByRole("heading", { level: 1, name: discipline.title })).toBeInTheDocument()
    expect(container.querySelector(".discipline-stage source")).toHaveAttribute("src", `${discipline.video}.mp4`)
    expect(container.querySelector(".discipline-stage .stage-still")).toHaveAttribute("src", `${discipline.video}-still.jpg`)
    expect(screen.getByRole("button", { name: `Replay the ${discipline.reveal} reveal` })).toBeInTheDocument()

    const cards = [...container.querySelectorAll(".project-grid .project-card")]
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(projectsFor(id).map((project) => `/projects/${project.slug}`))

    const next = screen.getByRole("navigation", { name: "Other disciplines" })
    expect(within(next).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      disciplines.filter((item) => item.id !== id).map((item) => item.path),
    )
  })

  it("shows the HintonX films on the motion page as privacy-enhanced posters", () => {
    render(<MemoryRouter><DisciplinePage id="motion" /></MemoryRouter>)
    expect(screen.getByRole("button", { name: "Play The Legend" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Play / })).toHaveLength(7)
  })
})

describe("server markup", () => {
  it("renders the finished home lockup and still frames, with nothing hidden inline", () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>)
    expect(html).toContain('id="md-wordmark"')
    expect(html).toContain("hero-lockup")
    expect(html).not.toContain("is-playing")
    expect(html).toContain("/assets/brand/reveals/web-decode-still.jpg")
    expect(html).not.toContain("opacity:0")
  })
})
