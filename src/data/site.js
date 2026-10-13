export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://matiadosen.com"

export const EMAIL = "matiadosen@outlook.com"

export const DESCRIPTOR = "Web, Motion & UX designer"

export const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/matia_dosen/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/matia-dosen-719090273" },
]

export const DOSEN_URL = "https://dosen.ca"

export const siteDescription = "Matia Dosen is a web, motion and UX designer in Ottawa. One person to design it, build it and make it move, start to finish."

export const shareImage = "/assets/brand/og-card.png"

export const asset = (filename) => `/assets/${filename}`

// Titles follow the browser-tab lockup on the brand sheet: "matia dosen · Web & UX designer".
export const pageMeta = {
  "/": { title: `Matia Dosen · ${DESCRIPTOR}`, description: siteDescription },
  "/projects": { title: "Work · Matia Dosen", description: "Websites, films, motion graphics, apps and print by Matia Dosen, 2019–2026." },
  "/web": { title: "Web development · Matia Dosen", description: "Websites and stores Matia Dosen designed and built: Frequency Shift, Chasing Greatness and more." },
  "/motion": { title: "Motion graphics · Matia Dosen", description: "Films, edits and motion graphics by Matia Dosen for HintonX, Adobe, Service Canada and Frequency Shift." },
  "/ux": { title: "UX design · Matia Dosen", description: "Apps and interfaces by Matia Dosen: ToldYa, Trendless and the Beatport redesign." },
  "/about": { title: "About · Matia Dosen", description: "Matia Dosen designs, builds and edits in Ottawa: Hinton Publishing, HintonX and Frequency Shift." },
  "/stack": { title: "Tools · Matia Dosen", description: "The software behind Matia Dosen’s design, film, music and development work." },
  "/contact": { title: "Contact · Matia Dosen", description: "Send Matia Dosen a note about design, video or web work." },
}
