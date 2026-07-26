import { Routes, Route, useLocation } from "react-router-dom"
import { useReducedMotion } from "motion/react"
import { ReactLenis } from "lenis/react"
import { SiteShell } from "./components/SiteShell"
import { ProjectDetail } from "./components/ProjectDetail"
import { getProject } from "./data/projects"
import { knownRoutes } from "./data/routes"
import HomePage from "./pages/HomePage"
import AboutPage from "./pages/AboutPage"
import ProjectsPage from "./pages/ProjectsPage"
import StackPage from "./pages/StackPage"
import ContactPage from "./pages/ContactPage"
import NotFoundPage from "./pages/NotFoundPage"
import "./styles/global.css"
import "./styles/editorial-v1.css"
import "./styles/layout-v2.css"

function ProjectRoute() {
  const slug = useLocation().pathname.split("/").filter(Boolean).at(-1)
  const project = getProject(slug)
  return project ? <ProjectDetail project={project} /> : <NotFoundPage />
}

export function App() {
  const reduced = useReducedMotion()
  const location = useLocation()
  const normalizedPath = location.pathname !== "/" ? location.pathname.replace(/\/$/, "") : "/"
  if (!knownRoutes.includes(normalizedPath)) return <NotFoundPage />
  const content = (
    <SiteShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/stack" element={<StackPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/projects/:slug" element={<ProjectRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteShell>
  )
  return reduced ? content : <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>{content}</ReactLenis>
}
