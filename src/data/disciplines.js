/**
 * The three things I do, in the order of the line under my name: Web, Motion & UX.
 * Each discipline has its own page and its own set of tools in the backdrop.
 * `reveal` and `video` are its reveal of the wordmark, for RevealStage, which no page renders for now.
 */
export const disciplines = [
  {
    id: "web",
    path: "/web",
    label: "Web",
    title: "Web development",
    reveal: "Decode",
    video: "/assets/brand/reveals/web-decode",
    tools: ["code-tag", "code-braces", "code-arrow"],
    intro: "Websites and Shopify stores: design and front-end development.",
    craft: "Figma · Framer · Shopify · React",
  },
  {
    id: "motion",
    path: "/motion",
    label: "Motion",
    title: "Motion graphics",
    reveal: "Pen Tool",
    video: "/assets/brand/reveals/motion-pen-tool",
    tools: ["pen-nib", "bezier-arc", "anchor-handles"],
    intro: "Video production and motion graphics: filming, editing, animation and sound.",
    craft: "Shooting · Editing · After Effects · Sound",
  },
  {
    id: "ux",
    path: "/ux",
    label: "UX",
    title: "UX design",
    reveal: "Responsive",
    video: "/assets/brand/reveals/ux-responsive",
    tools: ["cursor", "selection-box", "toggle"],
    intro: "App and interface design: research, wireframes and Figma prototypes.",
    craft: "Research · Wireframes · Figma prototypes",
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
