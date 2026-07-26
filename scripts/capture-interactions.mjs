import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright-core"

const base = process.env.VISUAL_URL || "http://127.0.0.1:4173"
const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const output = path.resolve("references", "interactions")
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath, headless: true })

try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })
  await mobile.goto(base, { waitUntil: "networkidle" })
  await mobile.getByRole("button", { name: "Open menu" }).click()
  await mobile.waitForTimeout(400)
  await mobile.screenshot({ path: path.join(output, "mobile-menu-open.png"), fullPage: false })
  await mobile.keyboard.press("Escape")
  await mobile.close()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })
  await desktop.goto(base, { waitUntil: "networkidle" })
  const firstCard = desktop.locator(".home-project-card").first()
  await firstCard.hover()
  await firstCard.screenshot({ path: path.join(output, "project-card-hover.png") })

  const desktopDosen = desktop.locator(".sidebar .dosen-button")
  await desktop.mouse.move(800, 400)
  await desktopDosen.screenshot({ path: path.join(output, "dosen-desktop-default.png") })
  await desktopDosen.hover()
  await desktopDosen.screenshot({ path: path.join(output, "dosen-desktop-hover.png") })
  const desktopDosenState = await desktopDosen.evaluate((element) => ({
    disco: getComputedStyle(element.querySelector(".dosen-icon-disco")).transform,
    filledDisco: getComputedStyle(element.querySelector(".dosen-icon-disco-filled")).transform,
    filledWordmark: getComputedStyle(element.querySelector(".dosen-wordmark-filled")).transform,
  }))
  if (
    desktopDosenState.disco === "none"
    || desktopDosenState.filledDisco !== "matrix(1, 0, 0, 1, 0, 0)"
    || desktopDosenState.filledWordmark !== "matrix(1, 0, 0, 1, 0, 0)"
  ) {
    throw new Error(`DOSEN desktop hover swap failed: ${JSON.stringify(desktopDosenState)}`)
  }
  await desktop.close()

  const tablet = await browser.newPage({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" })
  await tablet.goto(base, { waitUntil: "networkidle" })
  const tabletDosen = tablet.locator(".sidebar .dosen-button")
  await tablet.mouse.move(600, 300)
  await tabletDosen.screenshot({ path: path.join(output, "dosen-tablet-default.png") })
  await tabletDosen.hover()
  await tabletDosen.screenshot({ path: path.join(output, "dosen-tablet-hover.png") })
  const tabletDosenState = await tabletDosen.evaluate((element) => ({
    disco: getComputedStyle(element.querySelector(".dosen-icon-disco")).transform,
    filledDisco: getComputedStyle(element.querySelector(".dosen-icon-disco-filled")).transform,
    filledWordmark: getComputedStyle(element.querySelector(".dosen-wordmark-filled")).transform,
  }))
  if (
    tabletDosenState.disco === "none"
    || tabletDosenState.filledDisco !== "matrix(1, 0, 0, 1, 0, 0)"
    || tabletDosenState.filledWordmark !== "matrix(1, 0, 0, 1, 0, 0)"
  ) {
    throw new Error(`DOSEN tablet hover swap failed: ${JSON.stringify(tabletDosenState)}`)
  }
  await tablet.close()

  const video = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })
  await video.goto(`${base}/projects/animatic-remastered`, { waitUntil: "networkidle" })
  const poster = video.locator(".youtube-poster")
  await poster.screenshot({ path: path.join(output, "youtube-poster.png") })
  await poster.click()
  await video.locator(".youtube-frame").screenshot({ path: path.join(output, "youtube-player.png") })
  await video.close()
} finally {
  await browser.close()
}

console.log(`Saved interaction-state screenshots to ${output}`)
