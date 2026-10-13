/**
 * The three things I do, in the order of the line under my name: Web, Motion & UX.
 * Each discipline has its own page, its own reveal of the wordmark, and its own set of tools in the backdrop.
 */
export const disciplines = [
  {
    id: "web",
    path: "/web",
    label: "Web",
    title: "Web development",
    reveal: "Decode",
    revealNote: "My name resolves out of code characters, meant to resemble HTML.",
    video: "/assets/brand/reveals/web-decode",
    tools: ["code-tag", "code-braces", "code-arrow"],
    intro: "Websites and stores I design and then build myself, so nothing gets lost between the mockup and the browser.",
    summary: "I design in Figma, then build in Framer, Shopify or plain React. The Frequency Shift site, the Chasing Greatness store, the DOSEN press kit and this site all went from first sketch to live without a hand-off.",
  },
  {
    id: "motion",
    path: "/motion",
    label: "Motion",
    title: "Motion graphics",
    reveal: "Pen Tool",
    revealNote: "The wordmark gets drawn point by point, handles and all, the same way I build a shape path in After Effects.",
    video: "/assets/brand/reveals/motion-pen-tool",
    tools: ["pen-nib", "bezier-arc", "anchor-handles"],
    intro: "Films, edits and motion graphics: I shoot, cut, animate, mix and deliver.",
    summary: "Since 2019 I’ve made documentary, brand, sports and public-sector films at HintonX for clients including Adobe and Service Canada. I also cut the announcement and recap films for Frequency Shift, and every video ends on this wordmark.",
  },
  {
    id: "ux",
    path: "/ux",
    label: "UX",
    title: "UX design",
    reveal: "Responsive",
    revealNote: "The wordmark reflows between breakpoint widths before it settles on one line.",
    video: "/assets/brand/reveals/ux-responsive",
    tools: ["cursor", "selection-box", "toggle"],
    intro: "Apps and interfaces, researched with real people, prototyped in Figma and tested before they’re built.",
    summary: "From wireframes and prototypes for the ToldYa tennis app at HintonX to a team browser plugin that slows impulse buying, the work starts with who will use it and ends with something a developer can build. Often that developer is me.",
  },
]

export const disciplineIds = disciplines.map((discipline) => discipline.id)

export function getDiscipline(id) {
  return disciplines.find((discipline) => discipline.id === id)
}

/** Which discipline a route belongs to, so the header mark and the backdrop can match the page. */
export function disciplineForPath(pathname, projectDisciplines = {}) {
  const [first, second] = pathname.split("/").filter(Boolean)
  if (disciplineIds.includes(first)) return first
  if (first === "projects" && second) return projectDisciplines[second]?.[0] ?? null
  return null
}
