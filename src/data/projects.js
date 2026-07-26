import trendless from "./projectRecords/trendless"
import animaticRemastered from "./projectRecords/animatic-remastered"
import sevenDueDates from "./projectRecords/seven-due-dates"
import chasingGreatness from "./projectRecords/2024-chasing-greatness"
import novakBooks from "./projectRecords/novak-books"
import menuDesign from "./projectRecords/menu-design"
import beatportRedesign from "./projectRecords/beatport-redesign"
import toldyaTennis from "./projectRecords/toldya-tennis"

/**
 * Shared project-detail records. Every record contains route metadata, localized
 * cover/gallery media, ordered render blocks, related slugs, and route SEO.
 */
export const projects = [
  trendless,
  animaticRemastered,
  sevenDueDates,
  chasingGreatness,
  novakBooks,
  menuDesign,
  beatportRedesign,
  toldyaTennis,
]

export function getProject(slug) {
  return projects.find((project) => project.slug === slug)
}
