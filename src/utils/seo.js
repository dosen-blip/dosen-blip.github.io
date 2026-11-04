import { getProject } from "../data/projects"
import { SITE_URL, pageMeta, shareImage, siteDescription } from "../data/site"

/** A route's title, description and share image: what the prerendered head says, and what the tab shows after a click. */
export function metaFor(path) {
  const slug = path.startsWith("/projects/") ? path.split("/").filter(Boolean).at(-1) : null
  const project = slug ? getProject(slug) : null
  const meta = project
    ? { ...project.seo, description: project.summary || project.seo.description }
    : pageMeta[path] ?? {}
  return {
    title: meta.title ?? "Matia Dosen",
    description: meta.description ?? siteDescription,
    image: meta.image || project?.cover || shareImage,
  }
}

export function seoFor({ path, title, description, image }) {
  const canonical = new URL(path, SITE_URL).href
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<link rel="canonical" href="${escapeAttr(canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(canonical)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ]
  if (image) {
    const imageUrl = new URL(image, SITE_URL).href
    tags.push(`<meta property="og:image" content="${escapeAttr(imageUrl)}">`)
    tags.push(`<meta name="twitter:image" content="${escapeAttr(imageUrl)}">`)
  }
  return tags.join("\n    ")
}

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char])
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;")
}
