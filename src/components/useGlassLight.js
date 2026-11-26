import { useEffect } from "react"
import "../styles/glass-light.css"

// How far outside a piece of glass the LED starts to reach into it, and how much of its light gets in from there.
const REACH = 150
const OUTSIDE_LIGHT = 0.55

// Rates per second. The light in the glass is quick to catch and slow to cool, and the further it has scattered from the
// LED, the later it follows: the core is on the dot, the middle a beat behind, the wide glow well behind.
const CATCH = 12
const COOL = 2.6
const MIDDLE = 18
const WIDE = 6
const SURGE_DECAY = 4
const SPREAD_FULL = 1800 // px/s at which the light is spread its widest

const targets = new Set()
let pointer = null
let frame = 0
let last = 0
let listening = false
let moved = false
let reduced = false
let darkQuery = null

function isDarkTheme() {
  const theme = document.documentElement.dataset.theme
  return theme ? theme === "dark" : Boolean(darkQuery?.matches)
}

function write(target) {
  const { host, x, y, mx, my, fx, fy, lit, surge, spread } = target
  const { style } = host
  style.setProperty("--gl-x", `${x.toFixed(1)}px`)
  style.setProperty("--gl-y", `${y.toFixed(1)}px`)
  style.setProperty("--gl-mx", `${mx.toFixed(1)}px`)
  style.setProperty("--gl-my", `${my.toFixed(1)}px`)
  style.setProperty("--gl-fx", `${fx.toFixed(1)}px`)
  style.setProperty("--gl-fy", `${fy.toFixed(1)}px`)
  style.setProperty("--gl-lit", lit.toFixed(3))
  style.setProperty("--gl-surge", surge.toFixed(3))
  style.setProperty("--gl-spread", spread.toFixed(3))
}

function tick(now) {
  frame = 0
  const dt = Math.min((now - last) / 1000, 0.05) || 1 / 60
  last = now
  const towards = (rate) => (reduced ? 1 : 1 - Math.exp(-dt * rate))
  const light = pointer && isDarkTheme() ? pointer : null
  let busy = false

  // Read every box first and write afterwards, so a row of cards doesn't lay out once each.
  const seen = []
  for (const target of targets) {
    if (target.visible) seen.push([target, target.host.getBoundingClientRect(), target.host.offsetWidth])
  }

  for (const [target, box, layoutWidth] of seen) {
    const scale = layoutWidth ? box.width / layoutWidth : 1
    let wanted = 0
    let inside = false
    if (light) {
      const dx = Math.max(box.left - light.x, 0, light.x - box.right)
      const dy = Math.max(box.top - light.y, 0, light.y - box.bottom)
      inside = dx === 0 && dy === 0
      const distance = Math.hypot(dx, dy)
      if (inside) wanted = 1
      else if (distance < REACH) wanted = OUTSIDE_LIGHT * (1 - distance / REACH) ** 2
    }
    if (wanted === 0 && target.lit === 0) continue

    if (light) {
      const x = (light.x - box.left) / scale
      const y = (light.y - box.top) / scale
      // Coming on from dark, the light starts where the LED is rather than sweeping over from where it last was.
      if (target.lit < 0.01) {
        target.mx = target.fx = target.x = x
        target.my = target.fy = target.y = y
      }
      const travelled = Math.hypot(x - target.x, y - target.y)
      target.x = x
      target.y = y
      const speed = Math.min(travelled / dt / SPREAD_FULL, 1)
      target.spread += (speed - target.spread) * towards(speed > target.spread ? 10 : 2.5)
    } else {
      target.spread += (0 - target.spread) * towards(2.5)
    }

    // Crossing the edge throws a flash through the glass.
    if (inside && !target.inside && !reduced) target.surge = 1
    target.inside = inside
    target.surge *= Math.exp(-dt * SURGE_DECAY)
    if (target.surge < 0.002) target.surge = 0

    target.mx += (target.x - target.mx) * towards(MIDDLE)
    target.my += (target.y - target.my) * towards(MIDDLE)
    target.fx += (target.x - target.fx) * towards(WIDE)
    target.fy += (target.y - target.fy) * towards(WIDE)
    target.lit += (wanted - target.lit) * towards(wanted > target.lit ? CATCH : COOL)
    if (target.lit < 0.002 && wanted === 0) target.lit = 0

    write(target)
    const settled = Math.abs(target.lit - wanted) < 0.002
    const trailing = Math.hypot(target.x - target.fx, target.y - target.fy) > 0.5
    if (!settled || trailing || target.surge > 0 || target.spread > 0.002) busy = true
  }

  if (busy || moved) schedule()
  moved = false
}

function schedule() {
  if (frame) return
  frame = window.requestAnimationFrame(tick)
}

function onPointerMove(event) {
  if (event.pointerType === "touch") return
  pointer = { x: event.clientX, y: event.clientY }
  moved = true
  schedule()
}

function onPointerGone() {
  pointer = null
  schedule()
}

function listen() {
  if (listening) return
  listening = true
  last = performance.now()
  darkQuery = window.matchMedia("(prefers-color-scheme: dark)")
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.addEventListener("pointermove", onPointerMove, { passive: true })
  window.addEventListener("scroll", schedule, { passive: true })
  document.documentElement.addEventListener("pointerleave", onPointerGone)
}

function unlisten() {
  if (!listening || targets.size) return
  listening = false
  window.cancelAnimationFrame(frame)
  frame = 0
  pointer = null
  window.removeEventListener("pointermove", onPointerMove)
  window.removeEventListener("scroll", schedule)
  document.documentElement.removeEventListener("pointerleave", onPointerGone)
}

/**
 * The cursor's LED as a light source inside the glass: it reaches in from just outside, scatters out from the dot and
 * follows it at different speeds, and flares as it crosses the edge. Writes the --gl-* properties on each element matching
 * `selector` inside `ref`, with no re-renders, for src/styles/glass-light.css to draw. One shared loop runs only while
 * there's light moving. Mouse and trackpad only, and only in the dark theme, where the LED exists. Change `refresh` when
 * the matching elements have been replaced.
 */
export function useGlassLight(ref, selector, refresh) {
  useEffect(() => {
    const root = ref.current
    if (!root || typeof IntersectionObserver === "undefined") return undefined
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return undefined

    const added = [...root.querySelectorAll(selector)].map((host) => ({
      host, visible: false, inside: false, x: 0, y: 0, mx: 0, my: 0, fx: 0, fy: 0, lit: 0, surge: 0, spread: 0,
    }))
    const byHost = new Map(added.map((target) => [target.host, target]))
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) byHost.get(entry.target).visible = entry.isIntersecting
    }, { rootMargin: `${REACH}px` })
    for (const target of added) {
      targets.add(target)
      observer.observe(target.host)
    }
    listen()

    return () => {
      observer.disconnect()
      for (const target of added) targets.delete(target)
      unlisten()
    }
  }, [ref, selector, refresh])
}
