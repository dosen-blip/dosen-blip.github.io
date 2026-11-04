import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { TITLE_GLYPHS } from "../brand/titleGlyphs"
import { afterCut } from "../transitions/arrival"
import { clamp01, easeInOutCubic, lerp } from "../transitions/ease"
import { NeonFilter } from "./NeonFilter"

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect

const DURATION = { motion: 1300, web: 1350, ux: 1450 }
const FONT_WAIT = 400 // ms; a title whose fonts aren't in by then just shows
const STRIKE = 1600 // the glass catching the light as the title settles, ms
const CODE_GLYPHS = "</>{}[]=;&#$%*+01"

/** Where each letter of the real heading sits, relative to the heading. Null if any can't be measured or has no outline. */
function measure(heading) {
  const text = heading.querySelector(".discipline-title-text")
  const node = text?.firstChild
  if (!node?.textContent || !document.createRange) return null
  const box = heading.getBoundingClientRect()
  const range = document.createRange()
  const rectOf = (index) => {
    range.setStart(node, index)
    range.setEnd(node, index + 1)
    return range.getClientRects()[0]
  }
  // An empty inline-block sits on the baseline, which gives the distance from a letter's box down to it.
  const probe = document.createElement("span")
  probe.style.cssText = "display:inline-block;width:0;height:0"
  text.prepend(probe)
  const baseline = probe.getBoundingClientRect().bottom
  probe.remove()
  const first = rectOf(0)
  if (!first) return null
  const ascent = baseline - first.top

  const letters = []
  let word = 0
  for (let index = 0; index < node.textContent.length; index += 1) {
    const char = node.textContent[index]
    if (char === " ") {
      word += 1
      continue
    }
    const rect = rectOf(index)
    if (!rect || !TITLE_GLYPHS[char]) return null
    letters.push({ char, word, x: rect.left - box.left, y: rect.top - box.top + ascent, width: rect.width })
  }
  const style = getComputedStyle(heading)
  return { letters, width: box.width, height: box.height, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) }
}

function Canvas({ layout, kind, children }) {
  const { width, height, fontSize } = layout
  const margin = fontSize
  return (
    <svg className={`title-build title-build--${kind}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <defs>
        <NeonFilter id="title-neon" tube={1.8} halo={2.6} spill={3.5} scale={fontSize / 20} region={[-margin, -margin, width + margin * 2, height + margin * 2]} />
      </defs>
      {children}
    </svg>
  )
}

/** One letter's outline, in place. `delay` staggers its animation. */
function Letter({ letter, unit, delay, className = "tb-letter" }) {
  return (
    <g className={className} transform={`translate(${letter.x} ${letter.y}) scale(${unit})`} style={delay == null ? undefined : { "--d": `${delay}ms` }}>
      {/* one path, so a letter's counters stay open */}
      <path d={TITLE_GLYPHS[letter.char].map((contour) => contour.d).join("")} />
    </g>
  )
}

/** Motion: the pen draws each letter as a lit line and drops its anchors, then the ink comes in. */
function PenBuild({ layout }) {
  const unit = layout.fontSize / 1000
  const stroke = 1.2 / unit
  const handle = Math.max(3.5, layout.fontSize / 20)
  return (
    <Canvas layout={layout} kind="motion">
      <g className="tb-ink">
        {layout.letters.map((letter, index) => <Letter key={index} letter={letter} unit={unit} delay={560 + index * 24} />)}
      </g>
      <g className="tb-pen">
        {layout.letters.map((letter, index) => (
          <g key={index} transform={`translate(${letter.x} ${letter.y}) scale(${unit})`} style={{ "--d": `${80 + index * 28}ms` }}>
            {TITLE_GLYPHS[letter.char].map((contour) => <path key={contour.d} d={contour.d} pathLength="1" strokeWidth={stroke} />)}
          </g>
        ))}
        {layout.letters.flatMap((letter, index) => TITLE_GLYPHS[letter.char].flatMap((contour) => contour.anchors.slice(0, 2).map(([x, y], step) => (
          <rect
            key={`${index}-${x}-${y}`}
            x={letter.x + x * unit - handle / 2}
            y={letter.y + y * unit - handle / 2}
            width={handle}
            height={handle}
            style={{ "--d": `${80 + index * 28 + step * 90}ms` }}
          />
        ))))}
      </g>
    </Canvas>
  )
}

/** Web: lit code characters scramble over each letter, which locks in from left to right. */
function CodeBuild({ layout }) {
  const unit = layout.fontSize / 1000
  const ref = useRef(null)
  useEffect(() => {
    const spans = [...(ref.current?.children ?? [])]
    const pick = () => CODE_GLYPHS[Math.floor(Math.random() * CODE_GLYPHS.length)]
    const timer = window.setInterval(() => {
      for (const span of spans) span.textContent = pick()
    }, 55)
    return () => window.clearInterval(timer)
  }, [])
  const lock = (index) => 200 + index * 54
  return (
    <Canvas layout={layout} kind="web">
      <g className="tb-ink">
        {layout.letters.map((letter, index) => <Letter key={index} letter={letter} unit={unit} delay={lock(index)} />)}
      </g>
      <g ref={ref} className="tb-code" fontSize={layout.fontSize * .8}>
        {layout.letters.map((letter, index) => (
          <text key={index} x={letter.x + letter.width / 2} y={letter.y} textAnchor="middle" style={{ "--d": `${lock(index)}ms` }}>{CODE_GLYPHS[index % CODE_GLYPHS.length]}</text>
        ))}
      </g>
    </Canvas>
  )
}

/** UX: the title sits on two lines in a narrow frame, which widens as auto layout reflows it onto one, then lets go. */
function LayoutBuild({ layout }) {
  const { letters, fontSize, lineHeight } = layout
  const unit = fontSize / 1000
  const words = [...new Set(letters.map((letter) => letter.word))].map((word) => letters.filter((letter) => letter.word === word))
  const [firstWord, ...rest] = words
  const moved = rest.flat()
  const start = moved[0]
  const onOneLine = start && start.y === firstWord[0].y
  const pad = Math.max(6, fontSize / 9)
  const right = (group) => group.at(-1).x + group.at(-1).width
  const end = letters.at(-1)

  const wordsRef = useRef(null)
  const frameRef = useRef(null)
  const labelRef = useRef(null)
  const handlesRef = useRef(null)

  useEffect(() => {
    const dx = onOneLine ? firstWord[0].x - start.x : 0
    const dy = onOneLine ? lineHeight : 0
    const narrow = onOneLine ? Math.max(right(firstWord), right(moved)) + dx : right(letters)
    const wide = right(letters)
    const top = firstWord[0].y - fontSize * .78
    const bottomAt = (p) => end.y + lerp(dy, 0, p) + fontSize * .2
    const draw = (p) => {
      wordsRef.current?.setAttribute("transform", `translate(${lerp(dx, 0, p)} ${lerp(dy, 0, p)})`)
      const x = firstWord[0].x - pad
      const y = top - pad
      const w = lerp(narrow, wide, p) - firstWord[0].x + pad * 2
      const h = bottomAt(p) - top + pad * 2
      const frame = frameRef.current
      if (!frame) return
      frame.setAttribute("x", x)
      frame.setAttribute("y", y)
      frame.setAttribute("width", w)
      frame.setAttribute("height", h)
      const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
      ;[...handlesRef.current.children].forEach((handle, index) => {
        handle.setAttribute("x", corners[index][0] - 4)
        handle.setAttribute("y", corners[index][1] - 4)
      })
      labelRef.current?.setAttribute("transform", `translate(${x + w / 2} ${y + h + 18})`)
      const text = labelRef.current?.querySelector("text")
      if (text) text.textContent = `${Math.round(w)} × ${Math.round(h)}`
    }
    draw(0)
    let raf = 0
    const began = performance.now()
    const tick = (now) => {
      const p = easeInOutCubic(clamp01((now - began - 240) / 700))
      draw(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })

  return (
    <Canvas layout={layout} kind="ux">
      <g className="tb-solid">
        {firstWord.map((letter, index) => <Letter key={index} letter={letter} unit={unit} />)}
        <g ref={wordsRef}>
          {moved.map((letter, index) => <Letter key={index} letter={letter} unit={unit} />)}
        </g>
      </g>
      <g className="tb-frame">
        <rect ref={frameRef} className="tb-frame-line" />
        <g ref={handlesRef}>{[0, 1, 2, 3].map((corner) => <rect key={corner} className="tb-frame-handle" width="8" height="8" />)}</g>
        <g ref={labelRef} className="tb-frame-label">
          <rect x="-44" y="-11" width="88" height="20" rx="4" />
          <text textAnchor="middle" y="3" />
        </g>
      </g>
    </Canvas>
  )
}

const BUILDS = { motion: PenBuild, web: CodeBuild, ux: LayoutBuild }

/**
 * A discipline page's h1, built the way the discipline works: drawn with the pen, decoded from code, or laid out.
 * The heading is always the real text. The animation is a drawing laid over its measured letters, which goes away once
 * the text shows, and it never moves or holds up anything else. With reduced motion it's just the text.
 */
export function DisciplineTitle({ id, kind, title }) {
  const ref = useRef(null)
  const [layout, setLayout] = useState(null)
  const Build = BUILDS[kind]

  useBeforePaint(() => {
    const node = ref.current
    if (!node || !Build || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    node.dataset.state = "waiting"
    let live = true
    let doneTimer = 0
    let strikeTimer = 0

    const finish = () => {
      if (!live) return
      setLayout(null)
      node.dataset.state = "done"
      const glass = node.closest(".gc")
      if (!glass) return
      glass.classList.add("is-struck")
      strikeTimer = window.setTimeout(() => glass.classList.remove("is-struck"), STRIKE)
    }
    const play = async () => {
      const fonts = document.fonts
      if (fonts?.load) {
        await Promise.race([
          Promise.all([fonts.load('600 40px Outfit'), fonts.load('500 40px "JetBrains Mono"')]),
          new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT)),
        ]).catch(() => {})
      }
      if (!live) return
      const measured = fonts?.check?.('600 40px Outfit') ? measure(node) : null
      if (!measured) {
        finish()
        return
      }
      node.dataset.state = "playing"
      setLayout(measured)
      doneTimer = window.setTimeout(finish, DURATION[kind])
    }
    const stop = afterCut(play)
    return () => {
      live = false
      stop()
      window.clearTimeout(doneTimer)
      window.clearTimeout(strikeTimer)
    }
  }, [Build, kind])

  return (
    <h1 ref={ref} id={id} className="page-title discipline-title">
      <span className="discipline-title-text">{title}</span>
      {layout && Build && <Build layout={layout} />}
    </h1>
  )
}
