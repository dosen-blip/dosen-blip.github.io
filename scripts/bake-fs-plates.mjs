import fs from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { PNG } from "pngjs"

// Bakes the plates of the Frequency Shift laser room for its card art (FrequencyShiftCardArt.jsx): the project card and
// the folder sheet. No headless browser: with `npm run dev` running, start this receiver (`npm run bake:fs`), then open
// each URL it prints in the browser pane. The page renders the room (src/scenes/laser-room, the site's home sign) and
// posts the plates here; the receiver encodes them to WebP in public/assets/frequency-shift/card and exits once every
// plate has arrived. Open scripts/fs-bake.html without ?post to see every look side by side.
//
// Each plate: -base (the bare room: the sign, the lasers, the smoke and the fog off), -sign (what the sign adds to it),
// -lit (everything on, as one picture). What moves is a video of what it adds to the room (-show.mp4): the lasers, the
// smoke the sign and the beams light, and the fog bank rolling along the floor. It is one whole pass of the show at
// 30fps, its last two seconds faded over its first so it loops without a seam (the beams repeat exactly, the smoke never
// does), with its first frame as a still (-show.webp) for reduced motion and before it plays. The card stacks them all
// with plus-lighter.
const origin = process.env.DEV_ORIGIN || "http://localhost:5199"
const port = Number(process.env.BAKE_PORT || 4611)
const out = path.join(process.cwd(), "public", "assets", "frequency-shift", "card")

const only = process.env.ONLY?.split(",") // e.g. ONLY=sheet to rebake one plate
// The two pieces of card art and how each room is set up, shared by its plates and its video:
// - card (16:10, the project cards): the site's home lockup centred as on its hero, the show running the fan and then
//   the twin sheets, four bars each, and a fog bank rolling along the floor under it
// - sheet (272x184 at 3x, the glass folder): the monogram alone, high, where the strip that shows while the sheet is in
//   the stack catches the light. Its show is the ceiling's rain: columns of light falling straight down into the fog
//   bank, swaying, which the site brings in (with the full bank) as the camera turns to the floor (held on the hero's
//   view here: turn 1, tilt 0), over the fan thinned out above. (Not the site's sheet of light over the floor as well:
//   at this size, tilting up out of the fog, it read as a flat slab.)
const rooms = {
  card: { size: "1440x900", vsize: "960x600", order: "fan:4,twin:4", from: 8, fog: "0.7" },
  sheet: { size: "816x552", vsize: "544x368", sign: "monogram", anchor: "245,90,326", order: "fan:4", from: 0, rigs: "rain", turn: "1" },
}
const plates = [
  { name: "card", keep: ["base", "sign", "lit"] },
  { name: "sheet", keep: ["base", "sign"] },
  // what moves: drawn at the plate's size (the same framing) and kept smaller, as it's soft enough
  { name: "card", video: true, overlap: 2 },
  { name: "sheet", video: true, overlap: 2 },
].map((plate) => ({ ...rooms[plate.name], ...plate }))
const FPS = 30
const BPM = 124
const framesOf = (plate) => {
  const beats = plate.order.split(",").reduce((sum, entry) => sum + Number(entry.split(":")[1]) * 4, 0)
  return { frames: Math.round(((beats * 60) / BPM) * FPS), overlap: Math.round(FPS * plate.overlap) }
}

// ONLY=sheet rebakes one variant, ONLY=video (or plates) one kind
if (only) plates.splice(0, plates.length, ...plates.filter((plate) => only.includes(plate.name) || only.includes(plate.video ? "video" : "plates")))
const frameName = (plate, i) => `${plate.name}-frame-${String(i).padStart(4, "0")}`
const expected = new Set(plates.flatMap((plate) => {
  if (!plate.video) return plate.keep.map((kind) => `${plate.name}-${kind}`)
  const { frames, overlap } = framesOf(plate)
  return Array.from({ length: frames + overlap }, (_, i) => frameName(plate, i))
}))
const videos = plates.filter((plate) => plate.video)
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fs-bake-"))
await fs.mkdir(out, { recursive: true })

// a video's frames are all in: the stretch past the end faded over the start (frame i becomes the end's frame i fading
// into its own), so the last frame runs on into the first; then the first frame as the still, and the loop
async function encode(plate) {
  const { frames, overlap } = framesOf(plate)
  const read = async (i) => PNG.sync.read(await fs.readFile(path.join(tmp, `${frameName(plate, i)}.png`)))
  for (let i = 0; i < overlap; i++) {
    const own = await read(i)
    const end = await read(frames + i)
    const k = i / overlap
    for (let p = 0; p < own.data.length; p++) own.data[p] = Math.round(end.data[p] * (1 - k) + own.data[p] * k)
    await fs.writeFile(path.join(tmp, `${frameName(plate, i)}.png`), PNG.sync.write(own))
  }
  execFileSync("cwebp", ["-quiet", "-q", "90", "-m", "6", "-sharp_yuv", path.join(tmp, `${frameName(plate, 0)}.png`), "-o", path.join(out, `${plate.name}-show.webp`)])
  // mostly black, thin bright lines and soft smoke: x264 at a moderate quality, faststart so it plays while it loads
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-framerate", String(FPS), "-start_number", "0", "-i", path.join(tmp, `${plate.name}-frame-%04d.png`),
    "-frames:v", String(frames), "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF || "24", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-an", path.join(out, `${plate.name}-show.mp4`),
  ])
  const { size } = await fs.stat(path.join(out, `${plate.name}-show.mp4`))
  console.log(`${plate.name}-show.mp4 written (${frames} frames, ${(size / 1024).toFixed(0)} KB) and ${plate.name}-show.webp`)
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Methods", "POST")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.end()
  const name = decodeURIComponent(req.url.slice(1)).replace(/\.png$/, "")
  if (req.method !== "POST" || !expected.has(name)) {
    res.statusCode = 404
    return res.end()
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const png = path.join(tmp, `${name}.png`)
  await fs.writeFile(png, Buffer.concat(chunks))
  const isFrame = /-frame-\d+$/.test(name)
  if (!isFrame) {
    // the light layers are mostly black with thin bright lines: q90 keeps the beams clean
    const light = /-sign$/.test(name)
    execFileSync("cwebp", ["-quiet", "-q", light ? "90" : "86", "-m", "6", "-sharp_yuv", png, "-o", path.join(out, `${name}.webp`)])
  }
  expected.delete(name)
  if (!isFrame) console.log(`${name}.webp written`)
  res.end("ok")
  for (const plate of videos) {
    if (plate.encoded || [...expected].some((left) => left.startsWith(`${plate.name}-frame-`))) continue
    plate.encoded = true
    await encode(plate)
  }
  if (!expected.size) {
    server.close()
    await fs.rm(tmp, { recursive: true, force: true })
  }
})

server.listen(port, () => {
  console.log(`Receiving plates on :${port}. Open each of these:`)
  for (const plate of plates) {
    const query = new URLSearchParams({
      size: plate.size,
      name: plate.name,
      order: plate.order,
      atmos: "",
      ...(plate.video
        ? { from: String(plate.from), vsize: plate.vsize, fps: String(FPS), overlap: String(plate.overlap) }
        : { keep: plate.keep.join(",") }),
      post: `http://localhost:${port}`,
      ...Object.fromEntries(["sign", "anchor", "rigs", "turn", "fog"].filter((key) => plate[key]).map((key) => [key, plate[key]])),
    })
    console.log(`  ${origin}/scripts/fs-bake.html?${query}`)
  }
})
