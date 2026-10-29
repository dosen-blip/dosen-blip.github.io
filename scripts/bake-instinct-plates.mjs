import fs from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"

// Bakes the still plates of the Instinct Groove wall (card, folder sheet and phone/reduced-motion hero) from the live
// scene. No headless browser: with `npm run dev` running, start this receiver (`npm run bake:instinct`), then open each
// URL it prints in a normal browser window. The page renders the plate and posts it here; the receiver encodes it to
// WebP in public/assets/instinct and exits once every plate has arrived.
// Each plate comes out as -room (sign off), -sign (the sign's light alone, for plus-lighter) and/or -lit (both).
const origin = process.env.DEV_ORIGIN || "http://localhost:5199"
const port = Number(process.env.BAKE_PORT || 4610)
const out = path.join(process.cwd(), "public", "assets", "instinct")

const only = process.env.ONLY?.split(",")   // e.g. ONLY=sheet to rebake one plate
const plates = [
  // project cards (16:10): the lab's own composition, the sign centred in the room
  { name: "card", size: "1440x900", layout: "poster", keep: ["room", "sign", "lit"] },
  // glass-folder sheet (272x184 at 3x): the sign high, centred ~48 px down, just under the name, where the strip that shows
  // while the sheet is in the stack (and lifts on hover) catches its light
  { name: "sheet", size: "816x552", layout: "sheet", anchor: "180,113,457", keep: ["room", "sign"] },
  // hero still (phones, reduced motion, no WebGL2): the case layout without the letters, the page lights the wordmark.
  // The anchor is the wordmark slot in a 1600x900 window (x, y, width in the 1600x828 hero)
  { name: "hero", size: "1600x828", layout: "case", anchor: process.env.HERO_ANCHOR || "56,455,700", nocarve: true, keep: ["room"] },
]

if (only) plates.splice(0, plates.length, ...plates.filter((plate) => only.includes(plate.name)))
const expected = new Set(plates.flatMap((plate) => plate.keep.map((kind) => `${plate.name}-${kind}`)))
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "instinct-bake-"))

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Methods", "POST")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.end()
  const name = decodeURIComponent(req.url.slice(1)).replace(/\.png$/, "")
  if (req.method !== "POST" || !expected.has(name)) { res.statusCode = 404; return res.end() }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const png = path.join(tmp, `${name}.png`)
  await fs.writeFile(png, Buffer.concat(chunks))
  // the plates are dark gradients: lossy at high quality holds them; the sign layer keeps its faint glow at q90
  execFileSync("cwebp", ["-quiet", "-q", name.endsWith("-sign") ? "90" : "86", "-m", "6", "-sharp_yuv", png, "-o", path.join(out, `${name}.webp`)])
  expected.delete(name)
  console.log(`${name}.webp written${expected.size ? `, waiting for ${[...expected].join(", ")}` : ""}`)
  res.end("ok")
  if (!expected.size) {
    server.close()
    await fs.rm(tmp, { recursive: true, force: true })
  }
})

server.listen(port, () => {
  console.log(`Receiving plates on :${port}. Open each of these:`)
  for (const plate of plates) {
    const query = new URLSearchParams({
      size: plate.size, layout: plate.layout, name: plate.name, keep: plate.keep.join(","), post: `http://localhost:${port}`,
      ...(plate.focusY ? { focusY: plate.focusY } : {}), ...(plate.anchor ? { anchor: plate.anchor } : {}), ...(plate.nocarve ? { nocarve: "" } : {}),
    })
    console.log(`  ${origin}/scripts/instinct-bake.html?${query}`)
  }
})
