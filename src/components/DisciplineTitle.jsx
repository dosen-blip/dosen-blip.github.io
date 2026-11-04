import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { TITLE_GLYPHS } from "../brand/titleGlyphs"
import { afterUncover } from "../transitions/arrival"
import { clamp01, easeInOutCubic, lerp } from "../transitions/ease"
import { buildTime, realDuration } from "../transitions/titleClock"
import { NeonFilter } from "./NeonFilter"

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect

const FONT_WAIT = 400 // ms; a title whose fonts aren't in by then just shows
const STRIKE = 1600 // the title and the glass flaring as it lands, then cooling, ms
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
  const glass = heading.closest(".gc")?.getBoundingClientRect() ?? box
  return {
    letters,
    width: box.width,
    height: box.height,
    fontSize: parseFloat(style.fontSize),
    lineHeight: parseFloat(style.lineHeight),
    card: { x: glass.left - box.left, y: glass.top - box.top, width: glass.width, height: glass.height },
  }
}

function Canvas({ layout, kind, children }) {
  const { width, height, fontSize } = layout
  const margin = fontSize
  return (
    <svg className={`title-build title-build--${kind}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} focusable="false">
      <defs>
        <NeonFilter id="title-neon" tube={1.8} halo={2.6} spill={3.5} scale={fontSize / 20} region={[-margin, -margin * 3, width + margin * 2, height + margin * 6]} />
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

/** A pool of light on the glass, following the build along the title. */
function Light({ layout }) {
  return <span className="tb-light" style={{ "--tb-w": `${layout.width}px`, "--tb-size": `${layout.fontSize * 5}px` }} />
}

/** A steady pseudo-random number from 0 to 1, so the hand-drawn variation is the same on every visit. */
const wobble = (seed) => {
  const value = Math.sin(seed * 12.9898 + 4.1) * 43758.5453
  return value - Math.floor(value)
}

/**
 * How a hand would draw the title: an uneven rhythm from letter to letter, longer outlines taking longer, a counter started
 * once its letter's outside is mostly done, and a few nodes picked differently on each letter.
 */
function penPlan(letters) {
  let clock = 40
  return letters.map((letter, index) => {
    const contours = TITLE_GLYPHS[letter.char]
    const start = clock
    let finish = start
    const strokes = contours.map((contour, order) => {
      const time = 270 + contour.length * .09 + wobble(index * 7 + order) * 150
      const delay = start + (order ? finish - start : 0) * .62 + order * 30
      finish = Math.max(finish, delay + time)
      const offset = wobble(index + order * 3 + 11)
      const count = 1 + Math.floor(wobble(index * 3 + order) * 2)
      // Nodes spread around the outline from a different starting place each time, not the same few on every letter.
      const anchors = contour.nodes.length
        ? Array.from({ length: Math.min(count, contour.nodes.length) }, (_, step) => (
          contour.nodes[Math.floor(((offset + step / count) % 1) * contour.nodes.length)]
        ))
        : []
      const curved = anchors.filter((node) => Math.hypot(node[3], node[4]) > 30)
      const handles = wobble(index * 5 + order + 2) > .3 ? curved.slice(0, 1) : []
      return { contour, delay, time, anchors, handles }
    })
    clock += 20 + wobble(index + 41) * 60 + (index % 4 === 3 ? 26 : 0)
    return { letter, strokes, ink: finish - 90 + wobble(index + 5) * 60, index }
  })
}

/**
 * Motion: a white-hot point runs along each letter's outline at its own pace, leaving a lit line. Anchors drop as it passes,
 * and here and there a real bezier handle swings out along the curve's own tangent. Each letter ignites as it closes.
 */
function PenBuild({ layout }) {
  const unit = layout.fontSize / 1000
  const stroke = 1.2 / unit
  const box = Math.max(3.5, layout.fontSize / 20)
  const knob = Math.max(2, layout.fontSize / 34)
  const plan = penPlan(layout.letters)
  return (
    <>
      <Light layout={layout} />
      <Canvas layout={layout} kind="motion">
        <g className="tb-ink">
          {plan.map(({ letter, ink, index }) => <Letter key={index} letter={letter} unit={unit} delay={ink} />)}
        </g>
        <g className="tb-ignite">
          {plan.map(({ letter, ink, index }) => <Letter key={index} letter={letter} unit={unit} delay={ink} />)}
        </g>
        <g className="tb-pen">
          {plan.map(({ letter, strokes, ink, index }) => (
            <g key={index} className="tb-pen-letter" style={{ "--ink": `${ink + 120}ms` }}>
              <g transform={`translate(${letter.x} ${letter.y}) scale(${unit})`}>
                {strokes.map(({ contour, delay, time }) => (
                  <g key={contour.d} style={{ "--d": `${delay}ms`, "--t": `${time}ms` }}>
                    <path className="tb-line" d={contour.d} pathLength="1" strokeWidth={stroke} />
                    <path className="tb-point" d={contour.d} pathLength="1" strokeWidth={stroke * 2.4} />
                  </g>
                ))}
              </g>
              {strokes.flatMap(({ contour, delay, time, anchors, handles }) => {
                const place = ([x, y]) => [letter.x + x * unit, letter.y + y * unit]
                return [
                  ...anchors.map((node) => {
                    const [x, y] = place(node)
                    return (
                      <rect
                        key={`a-${contour.d}-${node[2]}`}
                        x={x - box / 2}
                        y={y - box / 2}
                        width={box}
                        height={box}
                        style={{ "--d": `${delay + node[2] * time}ms` }}
                      />
                    )
                  }),
                  ...handles.map((node) => {
                    const [x, y] = place(node)
                    // The direction is the curve's own; the length is whatever a hand happened to pull it to.
                    const reach = layout.fontSize * (.2 + wobble(node[0] + node[1]) * .24) / Math.hypot(node[3], node[4])
                    const dx = node[3] * reach
                    const dy = node[4] * reach
                    const swing = (wobble(node[1] + index) - .5) * 70
                    return (
                      <g key={`h-${contour.d}-${node[2]}`} transform={`translate(${x} ${y})`}>
                        <g className="tb-handle" style={{ "--d": `${delay + node[2] * time - 40}ms`, "--swing": `${swing}deg`, "--hold": `${480 + wobble(node[0]) * 280}ms` }}>
                          <line x1={-dx} y1={-dy} x2={dx} y2={dy} />
                          <circle cx={-dx} cy={-dy} r={knob} />
                          <circle cx={dx} cy={dy} r={knob} />
                        </g>
                      </g>
                    )
                  }),
                ]
              })}
            </g>
          ))}
        </g>
      </Canvas>
    </>
  )
}

/**
 * Web: columns of lit code hang over and under each letter, scrambling. A beam of light sweeps across the card and each
 * column collapses into its letter as the beam reaches it.
 */
function CodeBuild({ layout }) {
  const { letters, fontSize, lineHeight, card } = layout
  const unit = fontSize / 1000
  const rowsRef = useRef(null)
  const beamRef = useRef(null)
  const lock = (index) => 240 + index * 52
  const rows = [[-2, .12], [-1, .34], [1, .34], [2, .12]]
  const reach = letters.at(-1).x + letters.at(-1).width

  useEffect(() => {
    const spans = [...(rowsRef.current?.querySelectorAll("text") ?? [])]
    const pick = () => CODE_GLYPHS[Math.floor(Math.random() * CODE_GLYPHS.length)]
    const timer = window.setInterval(() => {
      for (const span of spans) span.textContent = pick()
    }, 60)
    const beam = beamRef.current?.animate?.([
      { transform: `translateX(${card.x}px)`, opacity: 0, offset: 0 },
      { transform: `translateX(${letters[0].x}px)`, opacity: 1, offset: .12 },
      { transform: `translateX(${reach}px)`, opacity: 1, offset: .68 },
      { transform: `translateX(${card.x + card.width}px)`, opacity: .4, offset: 1 },
    ], { duration: 1320, delay: 120, easing: "linear", fill: "both" })
    return () => {
      window.clearInterval(timer)
      beam?.cancel()
    }
  }, [card, letters, reach])

  return (
    <>
      <Light layout={layout} />
      <span ref={beamRef} className="tb-beam" style={{ top: card.y, height: card.height }} />
      <Canvas layout={layout} kind="web">
        <g ref={rowsRef}>
          <g className="tb-code-far" fontSize={fontSize * .8}>
            {letters.flatMap((letter, index) => rows.map(([row, opacity]) => (
              <text
                key={`${index}-${row}`}
                x={letter.x + letter.width / 2}
                y={letter.y}
                textAnchor="middle"
                opacity={opacity}
                style={{ "--d": `${lock(index) - 170}ms`, "--dy": `${row * lineHeight}px` }}
              >{CODE_GLYPHS[(index + row + 8) % CODE_GLYPHS.length]}</text>
            )))}
          </g>
          <g className="tb-code" fontSize={fontSize * .8}>
            {letters.map((letter, index) => (
              <text key={index} x={letter.x + letter.width / 2} y={letter.y} textAnchor="middle" style={{ "--d": `${lock(index)}ms` }}>{CODE_GLYPHS[index % CODE_GLYPHS.length]}</text>
            ))}
          </g>
        </g>
        <g className="tb-ink">
          {letters.map((letter, index) => <Letter key={index} letter={letter} unit={unit} delay={lock(index)} />)}
        </g>
        <g className="tb-ignite">
          {letters.map((letter, index) => <Letter key={index} letter={letter} unit={unit} delay={lock(index)} />)}
        </g>
      </Canvas>
    </>
  )
}

const overshoot = (x) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2

/**
 * UX: a layout grid drops across the card with guides at the title's cap height and baseline. The title sits on two lines
 * in a narrow selection frame, then the frame springs wide and the letters follow it onto one line, one after another,
 * with lit outlines trailing behind. Then the grid and the frame let go.
 */
function LayoutBuild({ layout, clock }) {
  const { letters, fontSize, lineHeight, card } = layout
  const unit = fontSize / 1000
  const words = [...new Set(letters.map((letter) => letter.word))].map((word) => letters.filter((letter) => letter.word === word))
  const [firstWord, ...rest] = words
  const moved = rest.flat()
  const start = moved[0]
  const onOneLine = start && start.y === firstWord[0].y
  const pad = Math.max(6, fontSize / 9)
  const right = (group) => group.at(-1).x + group.at(-1).width
  const end = letters.at(-1)
  const inner = card.width + card.x * 2
  const count = card.width < 700 ? 4 : 12
  const gutter = Math.max(8, card.width / 80)
  const column = (inner - gutter * (count - 1)) / count
  const cap = firstWord[0].y - fontSize * .7
  const baseline = firstWord[0].y

  const movedRef = useRef(null)
  const ghostsRef = useRef(null)
  const frameRef = useRef(null)
  const labelRef = useRef(null)
  const handlesRef = useRef(null)

  useEffect(() => {
    const dx = onOneLine ? firstWord[0].x - start.x : 0
    const dy = onOneLine ? lineHeight : 0
    const narrow = onOneLine ? Math.max(right(firstWord), right(moved)) + dx : right(letters)
    const wide = right(letters)
    const top = firstWord[0].y - fontSize * .78
    const at = (time, wait, length) => clamp01((time - wait) / length)
    const shift = (node, p) => node.setAttribute("transform", `translate(${lerp(dx, 0, p)} ${lerp(dy, 0, p)})`)
    const draw = (time) => {
      const reflow = at(time, 300, 620)
      const p = overshoot(reflow)
      ;[...(movedRef.current?.children ?? [])].forEach((node, index) => shift(node, overshoot(at(time, 300 + index * 34, 520))))
      ;[...(ghostsRef.current?.children ?? [])].forEach((node, index) => shift(node, easeInOutCubic(at(time, 300 - (index + 1) * 10, 520 + (index + 1) * 120))))
      const frame = frameRef.current
      if (!frame) return
      const x = firstWord[0].x - pad
      const y = top - pad
      const w = lerp(narrow, wide, p) - firstWord[0].x + pad * 2
      const h = end.y + lerp(dy, 0, easeInOutCubic(reflow)) + fontSize * .2 - top + pad * 2
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
    const tick = () => {
      const time = clock.current
      draw(time)
      if (time < 1300) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })

  return (
    <Canvas layout={layout} kind="ux">
      <g className="tb-grid">
        {Array.from({ length: count }, (_, index) => (
          <rect key={index} x={index * (column + gutter)} y={card.y} width={column} height={card.height} style={{ "--d": `${index * 22}ms` }} />
        ))}
        {[cap, baseline].map((y) => <line key={y} x1={card.x} x2={card.x + card.width} y1={y} y2={y} />)}
      </g>
      <g ref={ghostsRef} className="tb-ghosts">
        {[0, 1, 2].map((ghost) => (
          <g key={ghost} opacity={.5 - ghost * .14}>
            {moved.map((letter, index) => <Letter key={index} letter={letter} unit={unit} />)}
          </g>
        ))}
      </g>
      <g className="tb-solid">
        {firstWord.map((letter, index) => <Letter key={index} letter={letter} unit={unit} />)}
        <g ref={movedRef}>
          {moved.map((letter, index) => <g key={index}><Letter letter={letter} unit={unit} /></g>)}
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
 * the text shows, and it never moves or holds up anything else. The text then lands with a gleam and a flare that cools,
 * while the glass flares with it. With reduced motion it's just the text.
 */
export function DisciplineTitle({ id, kind, title }) {
  const ref = useRef(null)
  const clock = useRef(0)
  const finished = useRef(() => {})
  const [layout, setLayout] = useState(null)
  const Build = BUILDS[kind]

  // Measure and lay the drawing out straight away, under the cut, so nothing has to mount in the moment it starts.
  useBeforePaint(() => {
    const node = ref.current
    if (!node || !Build || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    node.dataset.state = "waiting"
    let live = true
    let strikeTimer = 0

    finished.current = () => {
      if (!live) return
      setLayout(null)
      node.dataset.state = "landed"
      const glass = node.closest(".gc")
      glass?.classList.add("is-struck")
      strikeTimer = window.setTimeout(() => {
        node.dataset.state = "done"
        glass?.classList.remove("is-struck")
      }, STRIKE)
    }
    const prepare = async () => {
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
        finished.current()
        return
      }
      node.dataset.state = "playing"
      setLayout(measured)
    }
    prepare()
    return () => {
      live = false
      window.clearTimeout(strikeTimer)
    }
  }, [Build, kind])

  // Hold everything at its first frame, then run it on the build clock from the moment the cut opens over the title.
  useEffect(() => {
    const node = ref.current
    if (!layout || !node) return undefined
    const lede = node.parentElement?.querySelector(":scope > .lede")
    const drawing = node.querySelector(".title-build-fx")?.getAnimations?.({ subtree: true }) ?? []
    const animations = [...drawing, ...(lede?.getAnimations?.() ?? [])]
    for (const animation of animations) animation.pause()
    // The build lasts as long as its last animation, on the build clock.
    const duration = Math.max(0, ...drawing.map((animation) => animation.effect.getComputedTiming().endTime))
    clock.current = 0
    let raf = 0
    let doneTimer = 0
    const stop = afterUncover(node, () => {
      const began = performance.now()
      const tick = (now) => {
        clock.current = buildTime(now - began)
        for (const animation of animations) animation.currentTime = clock.current
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      doneTimer = window.setTimeout(() => finished.current(), realDuration(duration))
    })
    return () => {
      stop()
      cancelAnimationFrame(raf)
      window.clearTimeout(doneTimer)
    }
  }, [layout])

  return (
    <h1 ref={ref} id={id} className="page-title discipline-title">
      <span className="discipline-title-text">{title}</span>
      {layout && Build && <span className="title-build-fx" aria-hidden="true"><Build layout={layout} clock={clock} /></span>}
    </h1>
  )
}
