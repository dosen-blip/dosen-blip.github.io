import { describe, expect, it } from "vitest"
import { disciplineIds } from "../src/data/disciplines"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { projectIndex, projectsFor, workIndex } from "../src/data/projectIndex"
import ProjectsPage from "../src/pages/ProjectsPage"
import { projectSlugs } from "../src/data/routes"

describe("project index", () => {
  it("matches the project cards in display order", () => {
    expect(projectIndex).toEqual([
      { slug: "video-production", title: "Video Production at HintonX", category: "Film · HintonX", cover: "/assets/video-production-cover.jpg", disciplines: ["motion"] },
      {
        slug: "frequency-shift",
        title: "Frequency Shift",
        category: "Motion · Web · Events",
        cover: "/assets/frequency-shift/card/card-lit.webp",
        mediaBackground: "#020102",
        disciplines: ["web", "motion"],
      },
      {
        slug: "instinct-groove",
        title: "Instinct Groove",
        category: "Web development · WebGL",
        cover: "/assets/instinct/card-room.webp",
        mediaBackground: "#030504",
        disciplines: ["web"],
      },
      { slug: "trendless", title: "Trendless", category: "UX · Algonquin team project", cover: "/assets/trendless-cover.png", disciplines: ["ux"] },
      { slug: "animatic-remastered", title: "Animatic Remastered", category: "Motion graphics · Algonquin", cover: "/assets/animatic-cover.png", disciplines: ["motion"] },
      { slug: "seven-due-dates", title: "Seven Due Dates", category: "Video · Algonquin", cover: "/assets/seven-due-dates-cover.png", disciplines: ["motion"] },
      {
        slug: "2024-chasing-greatness",
        title: "Chasing Greatness - ECommerce Website",
        category: "Shopify · Hinton Publishing",
        cover: "/assets/chasing-greatness-cover.png",
        mediaFit: "contain",
        mediaBackground: "#0c1015",
        disciplines: ["web"],
      },
      { slug: "novak-books", title: "Novak Books", category: "Typesetting · Hinton Publishing", cover: "/assets/novak-books-cover.png", disciplines: [] },
      { slug: "menu-design", title: "Restaurant Menu Design", category: "Print · Algonquin", cover: "/assets/menu-design-cover.png", disciplines: [] },
      { slug: "beatport-redesign", title: "Beatport Redesign", category: "UI redesign · Algonquin", cover: "/assets/beatport-cover.png", disciplines: ["ux"] },
      { slug: "toldya-tennis", title: "ToldYa - Tennis Application", category: "UX · HintonX", cover: "/assets/toldya-cover.png", disciplines: ["ux"] },
    ])
  })

  it("leads the Work page with Frequency Shift, Instinct Groove, HintonX and Beatport, then the rest in display order", () => {
    const leads = ["frequency-shift", "instinct-groove", "video-production", "beatport-redesign"]
    expect(workIndex.slice(0, 4).map((project) => project.slug)).toEqual(leads)
    expect(workIndex.slice(4).map((project) => project.slug)).toEqual(projectIndex.map((project) => project.slug).filter((slug) => !leads.includes(slug)))

    const { container } = render(<MemoryRouter><ProjectsPage /></MemoryRouter>)
    const cards = [...container.querySelectorAll(".work-grid .project-card")].map((card) => card.getAttribute("href"))
    expect(cards.slice(0, 4)).toEqual(leads.map((slug) => `/projects/${slug}`))
    expect(cards).toHaveLength(projectIndex.length)
  })

  it("covers every project route and only tags known disciplines", () => {
    expect(projectIndex.map((project) => project.slug)).toEqual(projectSlugs)
    for (const project of projectIndex) {
      for (const id of project.disciplines) expect(disciplineIds).toContain(id)
    }
    expect(projectsFor("web").map((project) => project.slug)).toEqual(["frequency-shift", "instinct-groove", "2024-chasing-greatness"])
    expect(projectsFor("motion").map((project) => project.slug)).toEqual(["video-production", "frequency-shift", "animatic-remastered", "seven-due-dates"])
    expect(projectsFor("ux").map((project) => project.slug)).toEqual(["trendless", "beatport-redesign", "toldya-tennis"])
  })
})
