// Get the next page's media ready before the click lands (Lusion prefetches the next page on hover).
//
// Every page's code is already in the bundle, so what a navigation can wait on is media: a hero image still decoding
// when the page mounts under the cover holds up the frames around the swap. Pointing at a link (briefly), focusing it,
// or pressing on it fetches and decodes the images at the top of the page it leads to. No route lists a video while
// the reveal stage is off the discipline pages.

import { getProject } from "../data/projects"
import { projectIndex, projectsFor } from "../data/projectIndex"
import { disciplineIds } from "../data/disciplines"

const INTENT_MS = 60 // pointing must rest this long, so sweeping across a menu does not fetch everything
const PER_PAGE = 4 // images at the top of a page; the rest load as they scroll in, as now
const IMAGE = /\.(png|jpe?g|webp|avif|gif|svg)$/i
const PHONE = 810

function imagesIn(value, found) {
  if (found.length >= PER_PAGE) return found
  if (typeof value === "string") {
    if (value.startsWith("/") && IMAGE.test(value) && !found.includes(value)) found.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) imagesIn(item, found)
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) imagesIn(item, found)
  }
  return found
}

/** The media a route shows first: { images, videos }. */
export function mediaFor(pathname, width = typeof window === "undefined" ? 1280 : window.innerWidth) {
  const [first, second] = pathname.split("/").filter(Boolean)
  const covers = (list) => list.map((project) => project.cover)
  if (!first) return { images: covers(projectIndex.slice(0, 3)), videos: [] }
  if (first === "projects" && second) {
    const project = getProject(second)
    const cover = projectIndex.find((item) => item.slug === second)?.cover
    return { images: project ? imagesIn(project, cover ? [cover] : []).slice(0, PER_PAGE) : [], videos: [] }
  }
  if (first === "projects") return { images: covers(projectIndex.slice(0, PER_PAGE)), videos: [] }
  if (disciplineIds.includes(first)) return { images: covers(projectsFor(first).slice(0, PER_PAGE)), videos: [] }
  if (first === "about") return { images: [width < PHONE ? "/assets/portrait-mobile.png" : "/assets/portrait-desktop.png"], videos: [] }
  return { images: [], videos: [] }
}

const warmed = new Set()

function warmImage(url) {
  if (warmed.has(url)) return
  warmed.add(url)
  const image = new Image()
  image.decoding = "async"
  image.src = url
  image.decode?.().catch(() => {})
}

function warmVideo(url) {
  if (warmed.has(url)) return
  warmed.add(url)
  fetch(url, { priority: "low" }).catch(() => {})
}

export function prefetch(pathname) {
  const { images, videos } = mediaFor(pathname)
  images.forEach(warmImage)
  videos.forEach(warmVideo)
}

/** Which page an event's link leads to on this site, or null (external, new tab, or the page already shown). */
function destination(event) {
  const link = event.target?.closest?.("a[href]")
  if (!link || link.target === "_blank" || link.origin !== window.location.origin) return null
  return link.pathname === window.location.pathname ? null : link.pathname
}

export function trackIntent(target = document) {
  let timer = 0
  const onOver = (event) => {
    const path = destination(event)
    window.clearTimeout(timer)
    if (path) timer = window.setTimeout(() => prefetch(path), INTENT_MS)
  }
  const onOut = () => window.clearTimeout(timer)
  const onNow = (event) => {
    const path = destination(event)
    if (path) prefetch(path)
  }
  target.addEventListener("pointerover", onOver, true)
  target.addEventListener("pointerout", onOut, true)
  target.addEventListener("pointerdown", onNow, true)
  target.addEventListener("focusin", onNow, true)
  return () => {
    window.clearTimeout(timer)
    target.removeEventListener("pointerover", onOver, true)
    target.removeEventListener("pointerout", onOut, true)
    target.removeEventListener("pointerdown", onNow, true)
    target.removeEventListener("focusin", onNow, true)
  }
}
