import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { Routes, Route, useLocation } from "react-router-dom"
import { ReactLenis, useLenis } from "lenis/react"
import { SiteShell } from "./components/SiteShell"
import { TransitionOverlay } from "./components/TransitionOverlay"
import { ProjectDetail } from "./components/ProjectDetail"
import { FrequencyShiftDetail } from "./components/FrequencyShiftDetail"
import { getProject } from "./data/projects"
import { knownRoutes } from "./data/routes"
import { transition } from "./transitions/transitionStore"
import { takeOrigin, trackClicks } from "./transitions/origin"
import { DOT_TIMING } from "./transitions/dots"
import { FRAME_TIMING } from "./transitions/frame"
import { markHydrated, mountedAfterHydration } from "./utils/hydration"
import { useReducedMotion } from "./utils/useReducedMotion"
import HomePage from "./pages/HomePage"
import AboutPage from "./pages/AboutPage"
import ProjectsPage from "./pages/ProjectsPage"
import DisciplinePage from "./pages/DisciplinePage"
import StackPage from "./pages/StackPage"
import ContactPage from "./pages/ContactPage"
import NotFoundPage from "./pages/NotFoundPage"
import "./styles/tokens.css"
import "./styles/base.css"
import "./styles/shell.css"
import "./styles/components.css"

function normalizePath(pathname) {
  return pathname !== "/" ? pathname.replace(/\/$/, "") : "/"
}

function ProjectRoute({ pathname }) {
  const slug = pathname.split("/").filter(Boolean).at(-1)
  const project = getProject(slug)
  if (!project) return <NotFoundPage />
  return project.layout === "frequencyShift"
    ? <FrequencyShiftDetail project={project} />
    : <ProjectDetail project={project} />
}

function resetScroll(lenis) {
  window.scrollTo(0, 0)
  lenis?.scrollTo(0, { immediate: true, force: true })
}

/**
 * The pages, rendered against the route that is on screen rather than the one in the address bar.
 * A click changes the URL at once (the header follows it), but the content waits: the old page stays until the wipe
 * has covered it, the swap and scroll reset happen under cover, and the new page is uncovered.
 * Reduced motion, anything before hydration, and the same page asked for again swap immediately.
 * A click on a project card or folder sheet cuts with the selection box grown out of it; everything else, including
 * the back button, cuts with the dot grid, spreading from where you clicked.
 */
function Pages({ reduced }) {
  const location = useLocation()
  const lenis = useLenis()
  // `settle` is what to do with the scroll position once an immediate swap has rendered.
  const [view, setView] = useState(() => ({ location, settle: null }))
  const displayed = view.location

  if (location !== displayed) {
    if (location.pathname === displayed.pathname) setView({ location, settle: "top" })
    else if (reduced || !mountedAfterHydration()) setView({ location, settle: "reset" })
  }

  useEffect(() => {
    if (view.settle === "top") {
      // The current nav item again, say: no wipe, just back to the top.
      if (lenis) lenis.scrollTo(0)
      else window.scrollTo(0, 0)
    } else if (view.settle === "reset") {
      resetScroll(lenis)
    }
  }, [view, lenis])

  useEffect(() => trackClicks(), [])

  // The app puts every page at the top under the cover itself; the browser restoring a scroll position on back and
  // forward would jump the old page before the cover reaches it.
  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return undefined
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useEffect(() => {
    if (location === displayed || location.pathname === displayed.pathname || reduced || !mountedAfterHydration()) return
    const origin = takeOrigin()
    const style = origin?.rect ? "frame" : "dots"
    transition.navigate(() => {
      flushSync(() => setView({ location, settle: null }))
      resetScroll(lenis)
    }, { style, origin, ...(style === "frame" ? FRAME_TIMING : DOT_TIMING) })
  }, [location, displayed, lenis, reduced])

  // Nothing scrolls while the screen is covered.
  useEffect(() => {
    if (!lenis) return undefined
    const stopOnHide = transition.on("hidestart", () => lenis.stop())
    const startOnShow = transition.on("showend", () => lenis.start())
    return () => {
      stopOnHide()
      startOnShow()
    }
  }, [lenis])

  const pathname = normalizePath(displayed.pathname)
  if (!knownRoutes.includes(pathname)) return <><TransitionOverlay /><NotFoundPage /></>
  return (
    <>
      <TransitionOverlay />
      <SiteShell pathname={displayed.pathname}>
        <Routes location={displayed}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/web" element={<DisciplinePage key="web" id="web" />} />
          <Route path="/motion" element={<DisciplinePage key="motion" id="motion" />} />
          <Route path="/ux" element={<DisciplinePage key="ux" id="ux" />} />
          <Route path="/stack" element={<StackPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/projects/:slug" element={<ProjectRoute pathname={pathname} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SiteShell>
    </>
  )
}

export function App() {
  const reduced = useReducedMotion()
  useEffect(() => { markHydrated() }, [])
  const content = <Pages reduced={reduced} />
  return reduced ? content : <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>{content}</ReactLenis>
}
