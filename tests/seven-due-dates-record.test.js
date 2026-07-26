import { describe, expect, it } from "vitest"
import sevenDueDates from "../src/data/projectRecords/seven-due-dates"

describe("Seven Due Dates project record", () => {
  it("preserves the frozen metadata and related-project order", () => {
    expect(sevenDueDates).toMatchObject({
      slug: "seven-due-dates",
      title: "Seven Due Dates",
      category: "Academic Project",
      client: "Algonquin College",
      duration: "1 Week",
      cover: "/assets/vRbvWigCRAAs6gN38Olpwe6Xvo.png",
      gallery: [],
      relatedSlugs: ["trendless", "animatic-remastered", "2024-chasing-greatness"],
      seo: {
        title: "Seven Due Dates - My Framer Site",
        description: "UX Designer and Creative",
      },
    })
    expect(sevenDueDates).not.toHaveProperty("date")
    expect(sevenDueDates).not.toHaveProperty("liveUrl")
  })

  it("preserves the video and refined project information", () => {
    expect(sevenDueDates.blocks).toEqual([
      {
        type: "youtube",
        id: "etKoTyPgnnA",
        title: "Youtube Video",
      },
      {
        type: "richText",
        html: "<p><strong>A short project completed for the Innovative Strategies course: a 60–90 second video creatively demonstrating an understanding of the course deliverables. Select 4K YouTube quality for optimal viewing.</strong></p>",
      },
    ])
  })
})
