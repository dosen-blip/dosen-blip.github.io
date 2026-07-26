import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright-core"
import { knownRoutes } from "../src/data/routes.js"

const base = "https://matiadosen.com"
const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x900", width: 1024, height: 900 },
  { name: "810x900", width: 810, height: 900 },
  { name: "809x900", width: 809, height: 900 },
  { name: "390x844", width: 390, height: 844 },
]
const root = path.resolve("references")
await Promise.all(["screenshots", "dom", "styles"].map((dir) => fs.mkdir(path.join(root, dir), { recursive: true })))
const browser = await chromium.launch({ executablePath, headless: true })
const manifest = { capturedAt: new Date().toISOString(), source: base, routes: {} }
const referenceRoutes = [...knownRoutes, "/404-probe"]

async function captureViewport(route, key, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce" })
  const page = await context.newPage()
  const response = await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 30000 })
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 5000))]))
  await page.evaluate(() => Promise.race([
    Promise.all([...document.images].map((image) => image.complete ? true : new Promise((resolve) => { image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", resolve, { once: true }) }))),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]))
  const screenshot = `screenshots/${key}--${viewport.name}.png`
  await page.screenshot({ path: path.join(root, screenshot), fullPage: true })
  const data = await page.evaluate(() => {
    const links = [...document.links].map((a) => ({ text: a.innerText.trim(), href: a.href, target: a.target }))
    const assets = [...document.querySelectorAll("img,video,source,iframe")].map((node) => ({ tag: node.tagName.toLowerCase(), src: node.currentSrc || node.src || node.getAttribute("src"), alt: node.alt || "" }))
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((node) => ({ tag: node.tagName.toLowerCase(), text: node.innerText.trim() }))
    const styles = [...document.querySelectorAll("h1,h2,h3,h4,p,a,button,input,textarea,img")].slice(0, 500).map((node) => {
      const css = getComputedStyle(node)
      return { tag: node.tagName.toLowerCase(), text: (node.innerText || node.value || "").trim().slice(0, 160), font: css.font, color: css.color, background: css.backgroundColor, width: css.width, height: css.height, margin: css.margin, padding: css.padding, position: css.position }
    })
    return { title: document.title, metadata: [...document.querySelectorAll("meta,link[rel=canonical]")].map((node) => ({ name: node.name || node.getAttribute("property") || node.rel, content: node.content || node.href })), text: document.body.innerText, links, assets, headings, styles, html: document.documentElement.outerHTML }
  })
  await fs.writeFile(path.join(root, "dom", `${key}--${viewport.name}.html`), data.html)
  await fs.writeFile(path.join(root, "styles", `${key}--${viewport.name}.json`), JSON.stringify(data.styles, null, 2))
  delete data.html
  delete data.styles
  await context.close()
  return { status: response?.status(), screenshot, ...data }
}

try {
  for (const route of referenceRoutes) {
    const key = route === "/" ? "home" : route === "/404-probe" ? "404" : route.slice(1).replaceAll("/", "__")
    manifest.routes[route] = { viewports: {} }
    const captures = await Promise.all(viewports.map((viewport) => captureViewport(route, key, viewport)))
    captures.forEach((capture, index) => { manifest.routes[route].viewports[viewports[index].name] = capture })
  }
} finally {
  await browser.close()
}
await fs.writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2))
console.log(`Captured ${referenceRoutes.length} routes at ${viewports.length} viewports to ${root}`)
