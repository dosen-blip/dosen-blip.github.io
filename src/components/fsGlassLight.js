// Light on the glass, from the Frequency Shift site (~/Documents/FREQUEMCY 2, public/glass-light.js at b4d893c), for
// the case study's glass. The cursor is a small light held over the glass, and the styles under "Light on the glass"
// in src/styles/fs-room.css draw what a slab of glass does with it:
//
//   - on its face: a pool where the light falls, a hot core, colour fringes round the core turned toward the light,
//     and a fainter second image off the back face
//   - through it: light that enters the slab travels on through it and fans out, pink to cyan, toward the far side
//     (dispersion), coming out as a glow on the far edge
//   - on its edges: the bevel nearest the light catches it as a crisp bright line, glowing out past the edge and in
//     across the glass, its colours parted along the edge; the far bevel catches the light that came through
//
// Light reaching a pane from just off its edge still lights that edge and still crosses the glass, so panes catch the
// light before the cursor is over them. Everything is drawn once at a fixed size and then only moved, turned,
// stretched and faded (transform and opacity), so the light never repaints a pane however large. The light glides
// after the pointer on a critically damped spring, as a reflection slides on glass. Mice and trackpads only.
//
// What differs from the site's: it is installed on one page (`root`, the panes `selector`) and taken down with it.

const REACH = 190 // px beyond a pane at which its edge starts to catch the light
const FACE_REACH = 28 // px beyond a pane at which its face stops showing the light
const OUT = 26 // px the glint reaches past the pane for the glow outside its edge (matches --glint-out)
const FAN = 420 // px: the length the fan is drawn at (matches .glint__fan's width)
const SPRING = 26 // rad/s: the light's spring; higher follows tighter

const PIECES =
  '<span class="glint__outer"><i class="glint__outer-near" data-p="outer"></i><i class="glint__outer-far" data-p="farOuter"></i></span>'
  + '<span class="glint__face"><i class="glint__pool" data-p="pool"></i><i class="glint__fan" data-p="fan"></i>'
  + '<i class="glint__fringe" data-p="fringe"></i><i class="glint__core" data-p="core"></i><i class="glint__ghost" data-p="ghost"></i></span>'
  + '<span class="glint__inner"><i class="glint__inner-near" data-p="inner"></i><i class="glint__inner-far" data-p="farInner"></i></span>'
  + '<span class="glint__bevel"><i class="glint__edge-near" data-p="edge"></i><i class="glint__edge-far" data-p="farEdge"></i></span>'

/** Lights the glass under `root` that matches `selector`; returns a function that takes it all down again. */
export function installGlassLight(root, selector) {
  const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)")
  if (!fine?.matches) return () => {}
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const glints = new Map()
  let panes = []
  let dirty = true
  let lit = []
  let pointer = null
  let light = null
  let last = 0
  let raf = 0

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  function glint(el) {
    const held = glints.get(el)
    if (held && held.root.parentNode === el) return held
    const node = document.createElement("span")
    node.className = "glint"
    node.setAttribute("aria-hidden", "true")
    node.innerHTML = PIECES
    if (getComputedStyle(el).position === "static") el.classList.add("glint-host")
    el.appendChild(node)
    const g = { root: node, w: -1, h: -1 }
    for (const piece of node.querySelectorAll("i")) g[piece.dataset.p] = piece.style
    glints.set(el, g)
    return g
  }

  // The soft bands just inside and just outside a pane's edge, as masks drawn to its exact shape: a blurred rounded
  // rectangle cut by a sharp one. Drawn once per pane size, so the edges never show seams at the corners and cost
  // nothing while the light moves.
  const svg = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`
  const n = (v) => Math.max(0, v).toFixed(1)

  function shape(el, g, b) {
    const w = b.width
    const h = b.height
    const short = Math.min(w, h)
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, short / 2)
    const band = Math.min(20, short * 0.4)
    const o = OUT
    const inner = svg(n(w), n(h),
      `<defs><filter id='f' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='${n(band / 2.6)}'/></filter>`
      + `<mask id='m'><rect width='100%' height='100%' fill='white'/><rect x='${n(band)}' y='${n(band)}' width='${n(w - 2 * band)}' height='${n(h - 2 * band)}' rx='${n(r - band * 0.6)}' fill='black' filter='url(#f)'/></mask></defs>`
      + "<rect width='100%' height='100%' fill='white' mask='url(#m)'/>")
    const grow = o * 0.2
    const outer = svg(n(w + 2 * o), n(h + 2 * o),
      `<defs><filter id='f' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='${n(o / 3.2)}'/></filter>`
      + `<mask id='m'><rect width='100%' height='100%' fill='white'/><rect x='${o}' y='${o}' width='${n(w)}' height='${n(h)}' rx='${n(r)}' fill='black'/></mask></defs>`
      + `<rect x='${n(o - grow)}' y='${n(o - grow)}' width='${n(w + 2 * grow)}' height='${n(h + 2 * grow)}' rx='${n(r + grow)}' fill='white' filter='url(#f)' mask='url(#m)'/>`)
    const innerStyle = g.root.querySelector(".glint__inner").style
    const outerStyle = g.root.querySelector(".glint__outer").style
    innerStyle.webkitMaskImage = innerStyle.maskImage = inner
    outerStyle.webkitMaskImage = outerStyle.maskImage = outer
    g.w = w
    g.h = h
  }

  const off = (el) => glints.get(el)?.root.classList.remove("is-lit")

  function at(style, x, y, turn, stretch) {
    style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`
      + (turn === undefined ? "" : ` rotate(${turn.toFixed(4)}rad)`)
      + (stretch === undefined ? "" : ` scaleX(${stretch.toFixed(3)})`)
  }

  const fade = (style, v) => {
    style.opacity = Math.max(0, Math.min(1, v)).toFixed(3)
  }

  function frame(now) {
    raf = 0
    if (dirty) {
      panes = [...root.querySelectorAll(selector)]
      dirty = false
    }
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60)
    last = now

    if (!pointer) {
      lit.forEach(off)
      lit = []
      light = null
      return
    }
    if (!light || reduce.matches) light = { x: pointer.x, y: pointer.y, vx: 0, vy: 0 }
    else {
      // a critically damped spring: the light glides after the pointer and settles without overshooting
      const w = SPRING
      light.vx += (w * w * (pointer.x - light.x) - 2 * w * light.vx) * dt
      light.vy += (w * w * (pointer.y - light.y) - 2 * w * light.vy) * dt
      light.x += light.vx * dt
      light.y += light.vy * dt
    }
    const moving = Math.abs(pointer.x - light.x) + Math.abs(pointer.y - light.y) + Math.abs(light.vx) / 60 + Math.abs(light.vy) / 60 > 0.2

    // read every pane's place first, then write, so the page is laid out once per frame
    const vh = innerHeight
    const near = []
    for (const el of panes) {
      const r = el.getBoundingClientRect()
      if (!r.width || r.bottom < -REACH || r.top > vh + REACH) continue
      const dx = Math.max(r.left - light.x, 0, light.x - r.right)
      const dy = Math.max(r.top - light.y, 0, light.y - r.bottom)
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < REACH) near.push([el, r, d])
    }

    const nowLit = []
    for (const [p, b, dist] of near) {
      const g = glint(p)
      // the edge bands follow the pane's own corners: tell them its radius (again if the pane changes size)
      if (Math.abs(g.w - b.width) > 0.5 || Math.abs(g.h - b.height) > 0.5) shape(p, g, b)
      // the light in the pane's own frame (its border box)
      const x = light.x - b.left
      const y = light.y - b.top
      const hw = b.width / 2
      const hh = b.height / 2
      const cx = x - hw
      const cy = y - hh
      const len = Math.sqrt(cx * cx + cy * cy) || 1
      const ux = cx / len
      const uy = cy / len
      const turn = Math.atan2(uy, ux)
      // how far out from the middle the light is: 0 in the middle, 1 at the edge, more beyond it
      const out = Math.max(Math.abs(cx) / (hw || 1), Math.abs(cy) / (hh || 1))
      const inside = dist === 0
      const edgeOn = Math.min(1, out)
      const face = inside ? 1 : Math.max(0, 1 - dist / FACE_REACH)
      const t = 1 - dist / REACH
      const reach = t * t * (3 - 2 * t)
      // the near bevel: brightest as the light grazes it, from either side
      const bevel = inside ? 0.65 + 0.35 * edgeOn : reach
      // where light that came in near the pointer leaves the slab: straight on through the middle, at the far edge
      const sx = Math.abs(ux) * hh > Math.abs(uy) * hw ? hw / Math.abs(ux || 1) : hh / Math.abs(uy || 1)
      const fx = hw - ux * sx
      const fy = hh - uy * sx
      const span = Math.sqrt((fx - x) * (fx - x) + (fy - y) * (fy - y))
      // light carried through the glass: more the further off-centre it enters, and some even from just outside
      const through = inside ? 0.25 + 0.75 * edgeOn : 0.8 * reach

      at(g.pool, x, y)
      at(g.core, x, y)
      at(g.fringe, x, y, turn)
      at(g.ghost, x - ux * (6 + 18 * edgeOn), y - uy * (6 + 18 * edgeOn))
      at(g.fan, x, y, Math.atan2(fy - y, fx - x), span / FAN)
      at(g.edge, x, y, turn)
      at(g.inner, x, y, turn)
      at(g.outer, x + OUT, y + OUT, turn)
      at(g.farEdge, fx, fy)
      at(g.farInner, fx, fy)
      at(g.farOuter, fx + OUT, fy + OUT)

      fade(g.pool, face * (0.75 + 0.25 * edgeOn))
      fade(g.core, face)
      fade(g.fringe, face * (0.25 + 0.75 * edgeOn))
      fade(g.ghost, face * 0.85)
      fade(g.fan, through)
      fade(g.edge, bevel)
      fade(g.inner, bevel)
      fade(g.outer, bevel)
      fade(g.farEdge, through)
      fade(g.farInner, through * 0.85)
      fade(g.farOuter, through * 0.7)
      if (!g.root.classList.contains("is-lit")) g.root.classList.add("is-lit")
      nowLit.push(p)
    }
    for (const el of lit) if (!nowLit.includes(el)) off(el)
    lit = nowLit

    if (moving) kick()
  }

  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return
    pointer = { x: e.clientX, y: e.clientY }
    kick()
  }
  const onLeave = () => {
    pointer = null
    kick()
  }
  document.addEventListener("pointermove", onMove, { passive: true })
  document.documentElement.addEventListener("pointerleave", onLeave)
  window.addEventListener("blur", onLeave)
  window.addEventListener("scroll", kick, { passive: true })
  window.addEventListener("resize", kick, { passive: true })
  // React may put new panes on the page (a section revealed, an image loaded): look again when it changes
  const watcher = new MutationObserver(() => {
    dirty = true
  })
  watcher.observe(root, { childList: true, subtree: true })

  return () => {
    cancelAnimationFrame(raf)
    watcher.disconnect()
    document.removeEventListener("pointermove", onMove)
    document.documentElement.removeEventListener("pointerleave", onLeave)
    window.removeEventListener("blur", onLeave)
    window.removeEventListener("scroll", kick)
    window.removeEventListener("resize", kick)
    for (const [el, g] of glints) {
      g.root.remove()
      el.classList.remove("glint-host")
    }
    glints.clear()
  }
}
