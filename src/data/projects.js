import trendless from "./projectRecords/trendless"
import animaticRemastered from "./projectRecords/animatic-remastered"
import sevenDueDates from "./projectRecords/seven-due-dates"
import chasingGreatness from "./projectRecords/2024-chasing-greatness"
import novakBooks from "./projectRecords/novak-books"
import menuDesign from "./projectRecords/menu-design"
import beatportRedesign from "./projectRecords/beatport-redesign"
import toldyaTennis from "./projectRecords/toldya-tennis"
import videoProduction from "./projectRecords/video-production"
import frequencyShift from "./projectRecords/frequency-shift"

/**
 * Shared project-detail records. Every record contains route metadata, localized
 * media, related slugs, and route SEO. Custom layouts may replace render blocks
 * with their own structured content.
 */
export const projects = [
  videoProduction,
  frequencyShift,
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
