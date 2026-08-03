import { chromium } from "playwright-core"
import { knownRoutes } from "../src/data/routes.js"

const base = process.env.CRAWL_URL || "http://127.0.0.1:4173"
const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const browser = await chromium.launch({ executablePath, headless: true })
const failures = []
try {
  for (const route of knownRoutes) {
    const page = await browser.newPage()
    const errors = []
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()) })
    page.on("pageerror", (error) => errors.push(error.message))
    const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" })
    await page.locator('img[loading="lazy"]').evaluateAll((images) => {
      images.forEach((image) => { image.loading = "eager" })
    })
    await page.evaluate(() => Promise.race([
      Promise.all([...document.images].map((image) => image.complete
        ? true
        : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true })
          image.addEventListener("error", resolve, { once: true })
        }))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]))
    const title = await page.title()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
    const broken = await page.locator("img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src))
    const internalPaths = await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => new URL(link.href).pathname.replace(/\/$/, "") || "/"))
    const invalidInternal = internalPaths.filter((pathname) => !knownRoutes.includes(pathname))
    const expectedCanonical = `https://matiadosen.com${route === "/" ? "/" : route}`
    if (response?.status() !== 200 || !title || canonical !== expectedCanonical || errors.length || broken.length || invalidInternal.length) failures.push({ route, status: response?.status(), title, canonical, expectedCanonical, errors, broken, invalidInternal })
    await page.close()
  }
  const page = await browser.newPage()
  const response = await page.goto(`${base}/definitely-not-a-route`, { waitUntil: "domcontentloaded" })
  if (response?.status() !== 404) failures.push({ route: "unknown", status: response?.status() })
  await page.close()
} finally {
  await browser.close()
}
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1) }
console.log(`Crawled ${knownRoutes.length} routes; unknown route returned 404.`)
