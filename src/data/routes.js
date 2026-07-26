export const projectSlugs = [
  "trendless",
  "animatic-remastered",
  "seven-due-dates",
  "2024-chasing-greatness",
  "novak-books",
  "menu-design",
  "beatport-redesign",
  "toldya-tennis",
]

export const staticRoutes = ["/", "/about", "/projects", "/stack", "/contact"]
export const projectRoutes = projectSlugs.map((slug) => `/projects/${slug}`)
export const knownRoutes = [...staticRoutes, ...projectRoutes]

export const navItems = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/about", label: "About", icon: "about" },
  { to: "/projects", label: "Projects", icon: "projects" },
  { to: "/stack", label: "Stack", icon: "stack" },
  { to: "/contact", label: "Contact", icon: "contact" },
]
