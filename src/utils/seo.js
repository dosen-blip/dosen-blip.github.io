import { SITE_URL } from "../data/site"

export function seoFor({ path, title = "Matia Dosen", description = "UX Designer and Creative", image }) {
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
