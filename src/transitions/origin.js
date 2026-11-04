// Where a navigation came from, so the cut can start there.
//
// A capture-phase click listener notes the pointer position of every click, and for clicks on a project card or a
// folder sheet, the rectangle of the thing clicked and its picture: those navigations grow a selection box out of
// it, filled with that picture.
// The router changes the URL a moment later, and the app takes the note when it starts the transition.
// A note older than FRESH_MS is ignored, so the back button or a link followed from the keyboard much later
// never inherits a stale origin.

const FRESH_MS = 1000

// Elements whose own box becomes the selection frame. Project cards frame their media, not the caption.
const FRAMED = [
  [".project-card", ".project-card-frame"],
  [".gf-sheet", null],
]

let last = null

/** The card's picture, if it is loaded: the element itself (to draw on the canvas), how it fits, and what is behind it. */
function picture(element) {
  const image = element.querySelector("img")
  if (!image?.complete || !image.naturalWidth) return null
  const style = getComputedStyle(image)
  const behind = getComputedStyle(image.parentElement).backgroundColor
  return {
    image,
    fit: style.objectFit === "contain" ? "contain" : "cover",
    background: behind && behind !== "rgba(0, 0, 0, 0)" && behind !== "transparent" ? behind : null,
  }
}

function box(element) {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { x: left, y: top, width, height }
}

/** Note where a click happened. Exported for tests; the app installs it with trackClicks. */
export function noteClick(event, now = performance.now()) {
  const target = event.target
  if (!target?.closest) return
  let rect = null
  let media = null
  for (const [selector, inner] of FRAMED) {
    const hit = target.closest(selector)
    if (!hit) continue
    const framed = (inner && hit.querySelector(inner)) || hit
    rect = box(framed)
    media = picture(framed)
    break
  }
  // Keyboard "clicks" report 0,0 (detail is 0): start from the middle of whatever was activated instead.
  const anchor = rect || box(target.closest("a, button") || target)
  const keyboard = event.detail === 0
  last = {
    x: keyboard ? anchor.x + anchor.width / 2 : event.clientX,
    y: keyboard ? anchor.y + anchor.height / 2 : event.clientY,
    rect,
    media,
    time: now,
  }
}

/** The last click, if it was recent enough to have caused this navigation. Each note is used once. */
export function takeOrigin(now = performance.now()) {
  const note = last
  last = null
  if (!note || now - note.time > FRESH_MS) return null
  const { x, y, rect, media } = note
  return { x, y, rect, media }
}

export function trackClicks(target = document) {
  const listener = (event) => noteClick(event)
  target.addEventListener("click", listener, true)
  return () => target.removeEventListener("click", listener, true)
}
