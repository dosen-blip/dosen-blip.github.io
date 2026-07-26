import { describe, expect, it } from "vitest"
import { projectIndex } from "../src/data/projectIndex"

describe("project index", () => {
  it("matches the eight frozen project cards in display order", () => {
    expect(projectIndex).toEqual([
      { slug: "trendless", title: "Trendless", category: "UI / UX", cover: "/assets/trendless-cover.png" },
      { slug: "animatic-remastered", title: "Animatic Remastered", category: "ACADEMIC PROJECT", cover: "/assets/animatic-cover.png" },
      { slug: "seven-due-dates", title: "Seven Due Dates", category: "ACADEMIC PROJECT", cover: "/assets/seven-due-dates-cover.png" },
      {
        slug: "2024-chasing-greatness",
        title: "Chasing Greatness - ECommerce Website",
        category: "ECOMMERCE, UX",
        cover: "/assets/chasing-greatness-cover.png",
        mediaFit: "contain",
        mediaBackground: "#0c1015",
      },
      { slug: "novak-books", title: "Novak Books", category: "PRINT MEDIA", cover: "/assets/novak-books-cover.png" },
      { slug: "menu-design", title: "Restaurant Menu Design", category: "ACADEMIC PROJECT", cover: "/assets/menu-design-cover.png" },
      { slug: "beatport-redesign", title: "Beatport Redesign", category: "ACADEMIC PROJECT", cover: "/assets/beatport-cover.png" },
      { slug: "toldya-tennis", title: "ToldYa - Tennis Application", category: "UX", cover: "/assets/toldya-cover.png" },
    ])
  })
})
