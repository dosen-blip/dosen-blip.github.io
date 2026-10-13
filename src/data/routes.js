export const projectSlugs = [
  "video-production",
  "frequency-shift",
  "trendless",
  "animatic-remastered",
  "seven-due-dates",
  "2024-chasing-greatness",
  "novak-books",
  "menu-design",
  "beatport-redesign",
  "toldya-tennis",
]

export const disciplineRoutes = ["/web", "/motion", "/ux"]
export const staticRoutes = ["/", "/about", "/projects", "/stack", "/contact", ...disciplineRoutes]
export const projectRoutes = projectSlugs.map((slug) => `/projects/${slug}`)
export const knownRoutes = [...staticRoutes, ...projectRoutes]

// The header carries the three pages from the brand sheet; Work also covers /web, /motion and /ux.
export const navItems = [
  { to: "/projects", label: "Work", matches: ["/projects", ...disciplineRoutes] },
  { to: "/about", label: "About", matches: ["/about", "/stack"] },
  { to: "/contact", label: "Contact", matches: ["/contact"] },
]
