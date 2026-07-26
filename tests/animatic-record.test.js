import { fireEvent, render, screen } from "@testing-library/react"
import { createElement } from "react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { ProjectDetail } from "../src/components/ProjectDetail"
import animaticRemastered from "../src/data/projectRecords/animatic-remastered"

describe("Animatic Remastered project record", () => {
  it("preserves metadata, content order, related order, and SEO", () => {
    expect(animaticRemastered).toEqual({
      slug: "animatic-remastered",
      title: "Animatic Remastered",
      category: "Academic Project",
      client: "Algonquin College",
      duration: "1 Week",
      cover: "/assets/animatic-cover.png",
      gallery: [],
      blocks: [
        {
          type: "youtube",
          id: "fSDhwuEcBgQ",
          title: "Youtube Video",
        },
        {
          type: "richText",
          html: "<p><strong>A remaster of a short motion-graphics project created at Algonquin College, with updated lighting and textures. The piece is heavily inspired by Twin Peaks. Watch in 1080p for the intended detail.</strong></p>",
        },
      ],
      relatedSlugs: ["trendless", "seven-due-dates", "2024-chasing-greatness"],
      seo: {
        title: "Animatic Remastered - My Framer Site",
        description: "UX Designer and Creative",
      },
    })
  })

  it("keeps the YouTube player behind a non-autoplay poster", () => {
    const { container } = render(
      createElement(
        MemoryRouter,
        null,
        createElement(ProjectDetail, { project: animaticRemastered }),
      ),
    )

    expect(container.querySelector("iframe")).toBeNull()
    expect(screen.getByRole("button", { name: "Play Youtube Video" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Play Youtube Video" }))

    const iframe = container.querySelector("iframe")
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/fSDhwuEcBgQ")
    expect(iframe.getAttribute("src")).not.toContain("autoplay=1")
  })
})
