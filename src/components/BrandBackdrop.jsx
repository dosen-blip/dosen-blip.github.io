import { useEffect, useMemo, useRef, useState } from "react"
import { ToolIcon } from "../brand/ToolIcon"
import { toolNames } from "../brand/toolNames"
import { getDiscipline } from "../data/disciplines"
import { setCursorHeat } from "../utils/cursorHeat"

const CELL_X = 120
const CELL_Y = 120
const ROWS_PER_TILE = 4
const PERIOD = CELL_Y * ROWS_PER_TILE // the pattern repeats every 480px, a multiple of the 30px dot grid
const PARALLAX = .22
const NEAR = 220
const PHONE = 810
const TOUCH = .62 // how near (0 to 1) the pointer must be before a tool starts tinting the cursor
const SPARK_EVERY = 900 // ms between icons lighting up blue
const SPARK_EVERY_PHONE = 600 // phones have no hover glow, so they spark more often

// Small deterministic hash so the scatter is stable between renders and resizes.
function hash(a, b, salt = 0) {
  let h = (a * 374761393 + b * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

// Tools fade towards the reading column so they never compete with the page: full at the edges, half in the middle.
function columnFade(x) {
  // Phones get no reading column (the page is all column); the tools just sit a little quieter.
  if (window.innerWidth < PHONE) return .8
  const p = x / window.innerWidth
  if (p < .1 || p > .9) return 1
  if (p < .26) return 1 - (p - .1) / .32
  if (p > .74) return .5 + (p - .74) / .32
  return .5
}

function buildIcons(width, discipline) {
  const own = getDiscipline(discipline)?.tools
  const columns = Math.ceil(width / CELL_X) + 1
  const rows = Math.ceil((window.innerHeight + PERIOD) / CELL_Y) + 1
  const icons = []
  for (let row = 0; row < rows; row += 1) {
    const tileRow = row % ROWS_PER_TILE
    for (let column = 0; column < columns; column += 1) {
      // Phones get a few more tools than desktop: smaller, and with no pointer they are lit by sparks alone.
      if (hash(column, tileRow) > (width < PHONE ? .88 : .5)) continue
      const pick = hash(column, tileRow, 7)
      const name = own && pick < .72
        ? own[Math.floor(hash(column, tileRow, 3) * own.length)]
        : toolNames[Math.floor(pick * toolNames.length) % toolNames.length]
      // Snap the loose offset to the 30px dot grid so every icon sits on the dots.
      const dx = Math.floor(hash(column, tileRow, 11) * 3) * 30
      const dy = Math.floor(hash(column, tileRow, 13) * 2) * 30
      icons.push({
        key: `${row}-${column}`,
        name,
        x: column * CELL_X + dx - 17,
        y: row * CELL_Y + dy - 9,
        fade: columnFade(column * CELL_X + dx + 15).toFixed(2),
        bob: 8 + Math.round(hash(column, tileRow, 17) * 10),
        tilt: Math.round((hash(column, tileRow, 23) - .5) * 16),
        duration: 9 + Math.round(hash(column, tileRow, 29) * 9),
        delay: -Math.round(hash(column, tileRow, 19) * 12000),
      })
    }
  }
  return icons
}

/**
 * The page ground from the brand sheet: a low-opacity dot grid with tools from each field floating on it.
 * Discipline pages lean on their own tools (pen paths for motion, code for web, interface pieces for UX).
 * The tools are client-only decoration; the dot grid is CSS and paints with the first frame.
 */
export function BrandBackdrop({ discipline = null }) {
  const [width, setWidth] = useState(0)
  const layerRef = useRef(null)
  const iconsRef = useRef(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setWidth(Math.round(window.innerWidth / CELL_X) * CELL_X))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", measure) }
  }, [])

  const icons = useMemo(() => (width ? buildIcons(width, discipline) : []), [width, discipline])

  useEffect(() => {
    const layer = layerRef.current
    const tools = iconsRef.current
    if (!layer || !tools || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    const dots = layer.querySelector(".backdrop-dots")
    const items = [...tools.children].map((node) => ({
      node, x: Number(node.dataset.x) + 32, y: Number(node.dataset.y) + 24, near: 0,
    }))
    const visible = new Set()
    let frame = 0
    let pointer = null
    let offset = 0
    let lastOffset = null
    let lit = 0

    const render = () => {
      frame = 0
      offset = (window.scrollY * PARALLAX) % PERIOD
      // Move the two layers directly: a custom property on their parent would restyle every tool on every scroll frame.
      if (offset !== lastOffset) {
        const shift = `translate3d(0, ${-offset}px, 0)`
        dots.style.transform = shift
        tools.style.transform = shift
        lastOffset = offset
      }
      if (!pointer && !lit) return
      let nearest = 0
      lit = 0
      for (const item of items) {
        let near = 0
        let push = [0, 0]
        if (pointer) {
          const dx = item.x - pointer[0]
          const dy = item.y - offset - pointer[1]
          const distance = Math.hypot(dx, dy)
          if (distance < NEAR) {
            near = 1 - distance / NEAR
            const force = near * 26 / (distance || 1)
            push = [dx * force, dy * force]
          }
        }
        // Only tools near the pointer (or just leaving it) are touched.
        if (near === 0 && item.near === 0) continue
        const { node } = item
        node.style.setProperty("--near", near.toFixed(3))
        node.style.setProperty("--push-x", `${push[0].toFixed(1)}px`)
        node.style.setProperty("--push-y", `${push[1].toFixed(1)}px`)
        node.classList.toggle("is-lit", near > 0)
        item.near = near
        if (near > 0) lit += 1
        nearest = Math.max(nearest, near)
      }
      // The cursor dot turns blue once it is right on top of a lit tool.
      setCursorHeat("backdrop", Math.min(1, Math.max(0, (nearest - TOUCH) / (.92 - TOUCH))))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render) }
    const onPointer = (event) => {
      if (event.pointerType === "touch") return
      pointer = [event.clientX, event.clientY]
      schedule()
    }
    const onLeave = () => { pointer = null; schedule() }

    // Tools off screen pause their idle motion, and only tools you can see are picked to spark.
    const nodeItems = new Map(items.map((item) => [item.node, item]))
    const watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-off", !entry.isIntersecting)
        if (entry.isIntersecting) visible.add(nodeItems.get(entry.target))
        else visible.delete(nodeItems.get(entry.target))
      }
    })
    items.forEach((item) => watcher.observe(item.node))

    const spark = window.setInterval(() => {
      if (!visible.size || document.hidden) return
      const pool = [...visible]
      const { node } = pool[Math.floor(Math.random() * pool.length)]
      node.classList.remove("is-spark")
      void node.offsetWidth
      node.classList.add("is-spark")
      window.setTimeout(() => node.classList.remove("is-spark"), 1600)
    }, window.innerWidth < PHONE ? SPARK_EVERY_PHONE : SPARK_EVERY)

    render()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("pointermove", onPointer, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      watcher.disconnect()
      setCursorHeat("backdrop", 0)
      window.clearInterval(spark)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("pointermove", onPointer)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [icons])

  return (
    <div ref={layerRef} className="backdrop" aria-hidden="true">
      <div className="backdrop-dots" />
      <div ref={iconsRef} key={discipline || "all"} className="backdrop-tools">
        {icons.map((icon) => (
          <span
            key={icon.key}
            className="backdrop-tool"
            data-x={icon.x}
            data-y={icon.y}
            style={{ left: icon.x, top: icon.y, "--fade": icon.fade, "--bob": `${icon.bob}px`, "--tilt": `${icon.tilt}deg`, "--wander": `${icon.duration}s`, "--bob-delay": `${icon.delay}ms` }}
          >
            <ToolIcon name={icon.name} className={`tool-icon--${icon.name}`} />
          </span>
        ))}
      </div>
    </div>
  )
}
