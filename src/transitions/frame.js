// The cut for project cards and folder sheets: the design tool's selection box takes over.
//
// Hiding, the blue selection frame snaps onto what was clicked, its handles drag out to the edges of the screen like
// a resize, and the size label counts up to the screen size. The card's own picture comes with it, so the bridge is
// the project's image filling the screen (stage black when there is no picture).
// Showing, the picture fades off the new page while the frame shrinks onto its hero (its title or neon
// wordmark), holds there for a beat with that element's size, then lets go. The hero is measured on every frame:
// it is rising into place as the frame arrives, so the frame rides it and lands where it settles.

import { clamp01, easeInOutCubic, easeOutCubic, lerp } from "./ease"

export const FRAME_TIMING = { hide: .7, show: 1, uncoverAt: 0 }
const HANDLE = 10
const LABEL_GAP = 10
const SCRIM = .28 // stage black laid over the picture by the time it fills the screen, so the frame reads on it
const INSET = 16 // targets are kept this far inside the screen so the handles never fall off it

// What the frame lands on after the swap, in order of preference: an explicit marker, then each page type's hero.
export const TARGETS = [
  "[data-transition-target]",
  ".fs-hero-neon-wordmark",
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

/** Where `element` is now, cut to the screen, or null when it is off screen. */
export function measureTarget(element, width, height) {
  const { left, top, width: w, height: h } = measure(element)
  return clipRect({ x: left, y: top, width: w, height: h }, width, height, INSET)
}

/** The new page's hero: the first of TARGETS that is on screen once the page has mounted under the cover. */
export function findTargetElement(root, width, height) {
  for (const selector of TARGETS) {
    const element = root.querySelector(selector)
    if (element && measureTarget(element, width, height)) return element
  }
  return null
}

/** Where the frame lands: the hero if there is one on screen, otherwise a box in the middle. */
export function findTarget(root, width, height) {
  const element = findTargetElement(root, width, height)
  return (element && measureTarget(element, width, height)) || centreRect(width, height)
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

/** Source and destination boxes to draw an image of iw × ih into `rect` the way CSS object-fit would, centred. */
export function fitImage(iw, ih, rect, fit = "cover") {
  const scale = fit === "contain" ? Math.min(rect.width / iw, rect.height / ih) : Math.max(rect.width / iw, rect.height / ih)
  if (fit === "contain") {
    const width = iw * scale
    const height = ih * scale
    return {
      source: { x: 0, y: 0, width: iw, height: ih },
      dest: { x: rect.x + (rect.width - width) / 2, y: rect.y + (rect.height - height) / 2, width, height },
    }
  }
  const width = rect.width / scale
  const height = rect.height / scale
  return { source: { x: (iw - width) / 2, y: (ih - height) / 2, width, height }, dest: rect }
}

function drawPicture(ctx, media, rect, alpha, scrim, stage) {
  const { image, fit, background } = media
  ctx.globalAlpha = alpha
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
  const { source, dest } = fitImage(image.naturalWidth, image.naturalHeight, rect, fit)
  ctx.drawImage(image, source.x, source.y, source.width, source.height, dest.x, dest.y, dest.width, dest.height)
  if (scrim > 0) {
    ctx.globalAlpha = alpha * scrim
    ctx.fillStyle = stage
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
}

/** Draw one frame of the selection cut. The canvas overhangs the viewport by 1px on each side (see shell.css). */
export function drawSelection(ctx, { width, height, dpr, frame, colors, media, phase, cover }) {
  const { rect, fill, chrome } = frame
  ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr)
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.clearRect(-1, -1, width + 2, height + 2)

  if (media) {
    // Hiding, the picture is the card's, grown with the frame and fully opaque from the start, so it begins exactly
    // as the card looks. Showing, it stays full screen and fades off the new page while the frame moves on.
    const screen = { x: -1, y: -1, width: width + 2, height: height + 2 }
    if (phase === "hiding") drawPicture(ctx, media, cover >= 1 ? screen : rect, 1, SCRIM * cover, colors.stage)
    else if (fill > 0) drawPicture(ctx, media, screen, fill, SCRIM, colors.stage)
  } else if (fill > 0) {
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
