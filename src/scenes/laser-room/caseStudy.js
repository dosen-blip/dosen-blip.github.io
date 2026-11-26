import { createLaserRoom } from "./scene.ts"

// The Frequency Shift site's laser room behind the portfolio's case study. This stands in for the site's own
// mount.ts (~/Documents/FREQUEMCY 2, components/laser-room/mount.ts): the same room, the same camera move down the
// page and the same cards on the floor, without the site's travel between pages and its other pages' rooms.
//
// What differs: the page keeps its own neon wordmark. The room builds its sign from that same artwork and hangs it
// exactly where the page put the wordmark, then leaves the letters out (`neon: false`), so the wall, the haze and
// the god rays are lit from behind the page's wordmark, and keeps it there every frame as the page scrolls and the
// camera turns (`follow`). There is no FS monogram, so the laser rig hangs over the middle of the room (`rigCentre`).
//
// The stage is fixed behind the whole article. At the top of the page the camera looks at the wall; as the page
// scrolls it turns down to the wet floor, where the page's photographs stand as lightboxes, and drifts back from
// the wall to the end of the page.

const TEXTURES = "/assets/frequency-shift/laser-room/"

/**
 * The page's blocks that the floor lights and reflects while the camera looks down (as the site's pageCards): a
 * photograph glows in its own colour, a glass panel faintly in the room's pink.
 */
const CARDS = [
  [".fs-web-browser", 1.4],
  [".fs-campaign-media", 1],
  [".fs-related-image", 0.9],
  [".fs-narrative, .fs-dj-aside", 0.45],
]
const PANEL = [1, 0.3, 0.72]

/**
 * Mounts the room into `stage` (fixed behind the page, see FrequencyShiftRoom.jsx).
 * page: the article, for its cards and for the room's light as custom properties.
 * wordmark: the page's neon wordmark (its box is where the sign's light comes from), drawn from `artwork`.
 * Resolves with the room's handle, or null if it was called off first.
 */
export async function mountCaseStudyRoom(stage, { page, wordmark, artwork, phone = false, signal, onStart, onFail } = {}) {
  await sized(stage, signal)
  if (signal?.aborted) return null
  const suffix = phone ? "-phone" : ""
  // where something sits on the page with the page scrolled to the top, which is what the camera at the top sees:
  // from layout offsets, so the copy's entrance animation can't skew it
  const rel = (el) => {
    let x = 0
    let y = 0
    for (let node = el; node; node = node.offsetParent) {
      x += node.offsetLeft
      y += node.offsetTop
    }
    const s = stage.getBoundingClientRect()
    return { x: x - s.left, y: y - s.top, w: el.offsetWidth, h: el.offsetHeight }
  }
  // where the wordmark sits on the page, measured again whenever the page changes size: with the scroll, that says
  // where it is on the screen at any moment, without reading the layout every frame
  let mark = rel(wordmark)
  const remeasure = new ResizeObserver(() => {
    mark = rel(wordmark)
  })
  remeasure.observe(document.body)
  signal?.addEventListener("abort", () => remeasure.disconnect(), { once: true })
  const path = pagePath(signal)
  const cards = pageCards(page, signal)
  const light = lightThePage(page, stage, signal)

  const room = await createLaserRoom(stage, {
    textures: { albedo: `${TEXTURES}floor-albedo${suffix}.webp`, surface: `${TEXTURES}floor-surface${suffix}.webp` },
    signKey: "case",
    // the sign is the page's wordmark artwork at the size the page shows it
    layout: (() => {
      const box = rel(wordmark)
      return { width: box.w, height: box.h, monogram: false, parts: [{ url: artwork, x: 0, y: 0, w: box.w, h: box.h }] }
    })(),
    anchor: () => (mark = rel(wordmark)),
    neon: false,
    // the sign stays behind the page's wordmark as the page scrolls and the camera turns, so the halo, the gap in the
    // smoke, the god rays and the floor's reflection all stay with it
    follow: () => ({ x: mark.x, y: mark.y - scrollY, w: mark.w, h: mark.h }),
    // the lasers belong to the room: the rig hangs over its middle, and its head in the clear band above the kicker
    rigCentre: true,
    headInBand: true,
    // the room runs up behind the sticky header: the laser head hangs below it
    topClear: () => document.querySelector(".site-header")?.offsetHeight ?? 0,
    page: path.page,
    cards: cards.visible,
    onLight: light,
    quality: phone ? "phone" : "full",
    signal,
    onStart,
    onFail,
    debug: location.search.includes("laser-debug"),
  })
  if (room && location.search.includes("laser-debug")) {
    readout(room, signal)
    // for judging frames by eye, as in the site's lab: ?laser-debug&laser-t=12 holds the show at 12 s, and the handle
    // is on window (fsLaserRoom.freeze(t) again after a scroll moves the camera there)
    window.fsLaserRoom = room
    signal?.addEventListener("abort", () => { if (window.fsLaserRoom === room) delete window.fsLaserRoom }, { once: true })
    const t = Number(new URLSearchParams(location.search).get("laser-t"))
    if (t > 0) room.freeze(t)
  }
  return room
}

/** resolves once the element has a size (or the mount is called off) */
function sized(el, signal) {
  return new Promise((resolve) => {
    if (el.clientWidth > 0 && el.clientHeight > 0) return resolve()
    const watch = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        watch.disconnect()
        resolve()
      }
    })
    watch.observe(el)
    signal?.addEventListener("abort", () => {
      watch.disconnect()
      resolve()
    }, { once: true })
  })
}

/** The camera's path down the page is the scroll itself, in screen heights (scene.ts turns it into one move). */
function pagePath(signal) {
  let end = 1
  const measure = () => {
    end = Math.max(1, document.documentElement.scrollHeight - innerHeight)
  }
  const resizer = new ResizeObserver(measure)
  resizer.observe(document.body)
  addEventListener("resize", measure, { passive: true })
  signal?.addEventListener("abort", () => {
    resizer.disconnect()
    removeEventListener("resize", measure)
  }, { once: true })
  measure()
  return { page: () => ({ at: scrollY / innerHeight, end: end / innerHeight }) }
}

/**
 * The page's cards over the room, for the floor to light and reflect. Measured where they sit on the page (again
 * when it changes size), so a frame costs no layout, only the scroll.
 */
function pageCards(page, signal) {
  const cards = []
  for (const [selector, power] of CARDS) {
    for (const el of page.querySelectorAll(selector)) {
      const card = { el, left: 0, top: 0, w: 0, h: 0, color: PANEL, power }
      cards.push(card)
      const img = el.querySelector("img")
      if (!img) continue
      // a photograph glows in its own colour, once it has loaded
      card.power = 0
      const take = () => {
        const tone = toneOf(img)
        if (!tone) return
        card.color = tone.color
        card.power = power * tone.light
      }
      if (img.complete && img.naturalWidth) take()
      else img.addEventListener("load", take, { once: true, signal })
    }
  }
  const measure = () => {
    for (const card of cards) {
      const r = card.el.getBoundingClientRect()
      Object.assign(card, { left: r.left, top: r.top + scrollY, w: r.width, h: r.height })
    }
  }
  const resizer = new ResizeObserver(measure)
  resizer.observe(document.body)
  signal?.addEventListener("abort", () => resizer.disconnect(), { once: true })
  measure()
  const out = []
  return {
    /** the cards on the screen now, nearest the middle first */
    visible() {
      out.length = 0
      const y = scrollY
      const h = innerHeight
      for (const c of cards) {
        const top = c.top - y
        if (c.power <= 0 || top > h || top + c.h < 0) continue
        out.push({ x: c.left, y: top, w: c.w, h: c.h, color: c.color, power: c.power })
      }
      return out.sort((a, b) => Math.abs(a.y + a.h / 2 - h / 2) - Math.abs(b.y + b.h / 2 - h / 2))
    },
  }
}

/**
 * a photograph's colour as a light: its average, more saturated, at full strength; and how much light it gives, more
 * for a brighter photograph and a more colourful one (the site's toneOf)
 */
function toneOf(img) {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 8
    const g = canvas.getContext("2d", { willReadFrequently: true })
    if (!g) return null
    g.drawImage(img, 0, 0, 8, 8)
    const d = g.getImageData(0, 0, 8, 8).data
    let r = 0
    let gr = 0
    let b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += (d[i] / 255) ** 2.2
      gr += (d[i + 1] / 255) ** 2.2
      b += (d[i + 2] / 255) ** 2.2
    }
    const n = d.length / 4
    r /= n
    gr /= n
    b /= n
    const lum = 0.2126 * r + 0.7152 * gr + 0.0722 * b
    const sat = (v) => Math.max(0, lum + (v - lum) * 1.8)
    const c = [sat(r), sat(gr), sat(b)]
    const top = Math.max(...c, 1e-4)
    const colourful = (top - Math.min(...c)) / top
    return { color: [c[0] / top, c[1] / top, c[2] / top], light: Math.min(1, 0.3 + Math.sqrt(lum) * 1.2) * (0.35 + 0.65 * colourful) }
  } catch {
    return null
  }
}

/**
 * The room's light, handed to the page as custom properties on the article (the site writes them on <html>; here
 * only the case study reads them). Only what changes slowly, and only once it has moved far enough to see: the
 * sign's light, how much laser light is in the air and how pink it is. The camera's turn down to the floor
 * (`--room-travel`) is written on the stage and the article, which are all that read it. The beat goes as CSS
 * animations kept in time with the show (beatClock).
 */
const LIGHT_VARS = [
  ["sign", 0.08],
  ["lasers", 0.08],
  ["pink", 0.03],
  ["travel", 0.01],
]
function lightThePage(page, stage, signal) {
  const written = {}
  const beat = beatClock(page, signal)
  signal?.addEventListener("abort", () => {
    for (const [k] of LIGHT_VARS) {
      page.style.removeProperty(`--room-${k}`)
      stage.style.removeProperty(`--room-${k}`)
    }
  }, { once: true })
  // the ends always land exactly
  const moved = (v, was, step) => was === undefined || Math.abs(v - was) >= step || ((v === 0 || v === 1) && v !== was)
  return (light) => {
    for (const [k, step] of LIGHT_VARS) {
      const v = light[k]
      if (!moved(v, written[k], step)) continue
      written[k] = v
      page.style.setProperty(`--room-${k}`, v.toFixed(3))
      if (k === "travel") stage.style.setProperty("--room-travel", v.toFixed(3))
    }
    beat(light.clock)
  }
}

/**
 * The page's pulses on the beat are CSS animations one bar long (the fs-beat-* keyframes), running on the
 * compositor. They start when the show does (`room-live` on the article). The show's clock is the scene's own, so
 * now and then each animation is checked against it and set right if it has drifted far enough to see.
 */
function beatClock(page, signal) {
  let live = false
  let checkAt = 0
  signal?.addEventListener("abort", () => page.classList.remove("room-live"), { once: true })
  return (clock) => {
    if (signal?.aborted || typeof page.getAnimations !== "function") return
    if (clock < 0) {
      if (live) page.classList.remove("room-live")
      live = false
      return
    }
    const now = performance.now()
    if (!live) {
      live = true
      page.classList.add("room-live")
      checkAt = now + 50
    }
    if (now < checkAt) return
    checkAt = now + 1000
    for (const animation of page.getAnimations({ subtree: true })) {
      if (typeof CSSAnimation === "undefined" || !(animation instanceof CSSAnimation) || !animation.animationName.startsWith("fs-beat-")) continue
      const bar = Number(animation.effect?.getComputedTiming().duration)
      const at = Number(animation.currentTime)
      if (!(bar > 0) || !Number.isFinite(at)) continue
      const off = ((((clock * bar - at) % bar) + bar * 1.5) % bar) - bar / 2
      if (Math.abs(off) > 30) animation.currentTime = at + off
    }
  }
}

/** The room's pace on the screen, with ?laser-debug in the address (as on the site), for reading a real device. */
function readout(room, signal) {
  const el = document.createElement("div")
  el.setAttribute("aria-hidden", "true")
  el.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99999;pointer-events:none;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.72);color:#fff;font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre"
  document.body.append(el)
  let draws = 0
  let late = 0
  const timer = window.setInterval(() => {
    const s = room.stats()
    el.textContent = `room ${s.draws - draws}/s (aims at ${s.rate})  late ${s.late - late}\n`
      + `stage ${s.stage}  sharpness ${s.resolution}  ${room.canvas.width}x${room.canvas.height}`
    draws = s.draws
    late = s.late
  }, 1000)
  signal?.addEventListener("abort", () => {
    clearInterval(timer)
    el.remove()
  }, { once: true })
}
