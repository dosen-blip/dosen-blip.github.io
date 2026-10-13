// Project cards in display order. `disciplines` ties each project to /web, /motion or /ux;
// print and book work has none and only appears on the full Work index.
export const projectIndex = [
  {
    slug: "video-production",
    title: "Video Production at HintonX",
    category: "Film · HintonX",
    cover: "/assets/video-production-cover.jpg",
    disciplines: ["motion"],
  },
  {
    slug: "frequency-shift",
    title: "Frequency Shift",
    category: "Creative direction · Web · Video",
    cover: "/assets/frequency-shift/fs-icon-vector.svg",
    mediaBackground: "#020102",
    disciplines: ["web", "motion"],
  },
  {
    slug: "trendless",
    title: "Trendless",
    category: "UX · Algonquin team project",
    cover: "/assets/trendless-cover.png",
    disciplines: ["ux"],
  },
  {
    slug: "animatic-remastered",
    title: "Animatic Remastered",
    category: "Motion graphics · Algonquin",
    cover: "/assets/animatic-cover.png",
    disciplines: ["motion"],
  },
  {
    slug: "seven-due-dates",
    title: "Seven Due Dates",
    category: "Video · Algonquin",
    cover: "/assets/seven-due-dates-cover.png",
    disciplines: ["motion"],
  },
  {
    slug: "2024-chasing-greatness",
    title: "Chasing Greatness - ECommerce Website",
    category: "Shopify · Hinton Publishing",
    cover: "/assets/chasing-greatness-cover.png",
    mediaFit: "contain",
    mediaBackground: "#0c1015",
    disciplines: ["web"],
  },
  {
    slug: "novak-books",
    title: "Novak Books",
    category: "Typesetting · Hinton Publishing",
    cover: "/assets/novak-books-cover.png",
    disciplines: [],
  },
  {
    slug: "menu-design",
    title: "Restaurant Menu Design",
    category: "Print · Algonquin",
    cover: "/assets/menu-design-cover.png",
    disciplines: [],
  },
  {
    slug: "beatport-redesign",
    title: "Beatport Redesign",
    category: "UI redesign · Algonquin",
    cover: "/assets/beatport-cover.png",
    disciplines: ["ux"],
  },
  {
    slug: "toldya-tennis",
    title: "ToldYa - Tennis Application",
    category: "UX · HintonX",
    cover: "/assets/toldya-cover.png",
    disciplines: ["ux"],
  },
]

export const projectDisciplines = Object.fromEntries(projectIndex.map((project) => [project.slug, project.disciplines]))

export function projectsFor(disciplineId) {
  return projectIndex.filter((project) => project.disciplines.includes(disciplineId))
}
