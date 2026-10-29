// The cut for project cards and folder sheets: the design tool's selection box takes over.
//
// Hiding, the blue selection frame snaps onto what was clicked, its handles drag out to the edges of the screen like
// a resize, the size label counts up to the screen size, and the inside fills with stage black.
// Showing, the black clears while the frame shrinks onto the new page's hero (its title, reveal or neon wordmark),
// holds there for a beat with that element's size, then lets go.

import { clamp01, easeInOutCubic, easeOutCubic, lerp } from "./ease"

export const FRAME_TIMING = { hide: .7, show: 1 }
const HANDLE = 10
const LABEL_GAP = 10
const INSET = 16 // targets are kept this far inside the screen so the handles never fall off it

// What the frame lands on after the swap, in order of preference: an explicit marker, then each page type's hero.
export const TARGETS = [
  "[data-transition-target]",
  ".fs-hero-neon-wordmark",
  ".discipline-stage",
  ".detail-head .page-title",
  "main h1",
]

export function lerpRect(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) }
}

/** `rect` cut down to the visible screen (less `inset`), or null when nothing of it is on screen. */
export function clipRect(rect, width, height, inset = 0) {
  const x = Math.max(rect.x, inset)
  const y = Math.max(rect.y, inset)
  const right = Math.min(rect.x + rect.width, width - inset)
  const bottom = Math.min(rect.y + rect.height, height - inset)
  if (right - x < 8 || bottom - y < 8) return null
  return { x, y, width: right - x, height: bottom - y }
}

/** A 16:9 box in the middle of the screen, for when there is nothing better to frame. */
export function centreRect(width, height) {
  const w = Math.min(width * .5, 560)
  const h = w * 9 / 16
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
}

/** A heading is framed around its words, not the full width of its block; anything else by its box. */
function measure(element) {
  if (/^H[1-6]$/.test(element.tagName) && element.ownerDocument?.createRange) {
    const range = element.ownerDocument.createRange()
    range.selectNodeContents(element)
    const rect = range.getBoundingClientRect?.()
    if (rect && rect.width > 0 && rect.height > 0) return rect
  }
  return element.getBoundingClientRect()
}

/** The new page's hero, measured once it is on screen under the cover. */
export function findTarget(root, width, height) {
  for (const selector of TARGETS) {
    const element = root.querySelector(selector)
    if (!element) continue
    const { left, top, width: w, height: h } = measure(element)
    const rect = clipRect({ x: left, y: top, width: w, height: h }, width, height, INSET)
    if (rect) return rect
  }
  return centreRect(width, height)
}

/**
 * The frame at one moment: where it is, how solid the black inside it is (fill), and how visible the outline,
 * handles and size label are (chrome).
 */
export function selectionFrame(phase, cover, { from, target, width, height }) {
  const screen = { x: 0, y: 0, width, height }
  if (phase === "hiding") {
    return {
      rect: lerpRect(from, screen, easeInOutCubic(cover)),
      fill: easeOutCubic(clamp01(cover / .55)),
      chrome: clamp01(cover / .06),
    }
  }
  const shown = 1 - cover
  return {
    rect: lerpRect(screen, target, easeOutCubic(clamp01(shown / .7))),
    fill: 1 - easeOutCubic(clamp01(shown / .5)),
    chrome: 1 - clamp01((shown - .84) / .16),
  }
}

/** Draw one frame of the selection cut. The canvas overhangs the viewport by 1px on each side (see shell.css). */
export function drawSelection(ctx, { width, height, dpr, frame, colors }) {
  const { rect, fill, chrome } = frame
  ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr)
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.clearRect(-1, -1, width + 2, height + 2)

  if (fill > 0) {
    ctx.globalAlpha = fill
    ctx.fillStyle = colors.stage
    const full = rect.width >= width && rect.height >= height
    if (full) ctx.fillRect(-1, -1, width + 2, height + 2)
    else ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
  if (chrome <= 0) return

  ctx.globalAlpha = chrome
  // Dark mode lights the frame like the rest of the blue: a glow around a white-hot line.
  if (colors.glow) {
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = 10
  }
  ctx.strokeStyle = colors.line
  ctx.lineWidth = 1
  ctx.strokeRect(rect.x + .5, rect.y + .5, rect.width - 1, rect.height - 1)

  ctx.lineWidth = 1.5
  ctx.fillStyle = colors.handle
  for (const [x, y] of [[rect.x, rect.y], [rect.x + rect.width, rect.y], [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height]]) {
    ctx.fillRect(x - HANDLE / 2, y - HANDLE / 2, HANDLE, HANDLE)
    ctx.strokeRect(x - HANDLE / 2, y - HANDLE / 2, HANDLE, HANDLE)
  }
  ctx.shadowBlur = 0

  // The live size, as under the hero lockup: below the frame, or tucked inside it when the frame fills the screen.
  const text = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
  ctx.font = `11px ${colors.mono}`
  const labelWidth = ctx.measureText(text).width + 14
  const labelHeight = 19
  const x = Math.min(Math.max(rect.x + rect.width / 2 - labelWidth / 2, 8), width - 8 - labelWidth)
  let y = rect.y + rect.height + LABEL_GAP
  if (y + labelHeight > height - 8) y = rect.y + rect.height - LABEL_GAP - labelHeight - HANDLE / 2
  ctx.fillStyle = colors.label
  if (ctx.roundRect) {
    ctx.beginPath()
    ctx.roundRect(x, y, labelWidth, labelHeight, 4)
    ctx.fill()
  } else {
    ctx.fillRect(x, y, labelWidth, labelHeight)
  }
  ctx.fillStyle = colors.labelText
  ctx.textBaseline = "middle"
  ctx.fillText(text, x + 7, y + labelHeight / 2 + .5)
}
