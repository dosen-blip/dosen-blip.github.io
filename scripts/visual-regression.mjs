import fs from "node:fs/promises"
import path from "node:path"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"
import { chromium } from "playwright-core"
import { knownRoutes } from "../src/data/routes.js"

const base = process.env.VISUAL_URL || "http://127.0.0.1:4173"
const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const referenceDir = path.resolve("references", "screenshots")
const localDir = path.resolve("references", "local")
const diffDir = path.resolve("references", "diff")
const allViewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x900", width: 1024, height: 900 },
  { name: "810x900", width: 810, height: 900 },
  { name: "809x900", width: 809, height: 900 },
  { name: "390x844", width: 390, height: 844 },
]
const routeFilter = process.env.VISUAL_ROUTES?.split(",").filter(Boolean)
const viewportFilter = process.env.VISUAL_VIEWPORTS?.split(",").filter(Boolean)
const routes = routeFilter?.length ? routeFilter : [...knownRoutes, "/404-probe"]
const viewports = viewportFilter?.length ? allViewports.filter((viewport) => viewportFilter.includes(viewport.name)) : allViewports
await Promise.all([localDir, diffDir].map((dir) => fs.mkdir(dir, { recursive: true })))
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function keyFor(route) {
  if (route === "/") return "home"
  if (route === "/404-probe") return "404"
  return route.slice(1).replaceAll("/", "__")
}

function whiteCanvas(width, height) {
  const image = new PNG({ width, height })
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = 255
    image.data[i + 1] = 255
    image.data[i + 2] = 255
    image.data[i + 3] = 255
  }
  return image
}

function normalized(image, width, height) {
  if (image.width === width && image.height === height) return image
  const canvas = whiteCanvas(width, height)
  const rowBytes = Math.min(image.width, width) * 4
  for (let y = 0; y < Math.min(image.height, height); y += 1) {
    image.data.copy(canvas.data, y * width * 4, y * image.width * 4, y * image.width * 4 + rowBytes)
  }
  return canvas
}

try {
  for (const route of routes) {
    const key = keyFor(route)
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce" })
      const page = await context.newPage()
      await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 30000 })
      await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}[style*='opacity:0'],[style*='opacity: 0']{opacity:1!important;transform:none!important}" })
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]))
      const localPath = path.join(localDir, `${key}--${viewport.name}.png`)
      await page.screenshot({ path: localPath, fullPage: true })
      await context.close()

      const reference = PNG.sync.read(await fs.readFile(path.join(referenceDir, `${key}--${viewport.name}.png`)))
      const local = PNG.sync.read(await fs.readFile(localPath))
      const width = Math.max(reference.width, local.width)
      const height = Math.max(reference.height, local.height)
      const expected = normalized(reference, width, height)
      const actual = normalized(local, width, height)
      const diff = whiteCanvas(width, height)
      const mismatched = pixelmatch(expected.data, actual.data, diff.data, width, height, { threshold: 0.15, includeAA: false })
      const ratio = mismatched / (width * height)
      const diffPath = path.join(diffDir, `${key}--${viewport.name}.png`)
      if (ratio > 0.01) await fs.writeFile(diffPath, PNG.sync.write(diff))
      results.push({ route, viewport: viewport.name, ratio, mismatched, pixels: width * height, referenceHeight: reference.height, localHeight: local.height })
    }
  }
} finally {
  await browser.close()
}

await fs.writeFile(path.resolve("references", "visual-results.json"), JSON.stringify(results, null, 2))
const failures = results.filter((result) => result.ratio > 0.01)
console.log(`Compared ${results.length} page/viewports. ${failures.length} exceeded the 1% pixel-difference budget.`)
for (const result of failures) console.log(`${result.route} ${result.viewport}: ${(result.ratio * 100).toFixed(2)}%`)
if (failures.length) process.exitCode = 1
