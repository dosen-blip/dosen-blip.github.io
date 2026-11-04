// Keep the old page on screen while the new one is already running, so the dot cut needs no covered moment.
//
// The browser's View Transitions API takes a picture of the page as it is, lets the app change the page, then shows the
// picture over the live result. Here the new page goes on top instead, clipped to one circle growing from the click, and
// the overlay canvas rides above both (it has its own view-transition-name, see shell.css) with the circle's edge hidden
// in the solid middle of its pulse. So ahead of the pulse is the old page, frozen; behind it is the new page, live.
//
// The circle follows the transition store's clock instead of running on its own, so it can never drift out from under
// the pulse. Browsers without the API, and the selection box, cut with the screen covered as before.

import { flushSync } from "react-dom"
import { revealRadius, waveOrigin } from "./dots"
import { transition } from "./transitionStore"

const REVEAL_FOR = 1000 // the circle's animation is scrubbed, so this is only its scale

let stopCurrent = null

export function canSnapshot() {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function"
}

/** Run a `wave` cut: `options` are the store's, `swap` changes the page once the browser has its picture of the old one. */
export function cutThroughSnapshot(swap, options) {
  stopCurrent?.()
  const wave = waveOrigin(window.innerWidth, window.innerHeight, options.origin)
  const widest = revealRadius(0, wave)
  let reveal = null

  // flushSync: the overlay has to be showing by the time the browser looks at the new page.
  const view = document.startViewTransition(() => {
    flushSync(() => transition.navigate(swap, options))
  })

  const follow = () => {
    if (reveal) reveal.currentTime = (revealRadius(transition.cover, wave) / widest) * REVEAL_FOR
  }
  const stopFrames = transition.watchFrames(follow)
  const stop = () => {
    stopFrames()
    stopEnd()
    reveal?.cancel()
    stopCurrent = null
  }
  const stopEnd = transition.on("showend", () => {
    stop()
    view.skipTransition()
  })
  stopCurrent = stop

  view.ready.then(() => {
    if (stopCurrent !== stop) return
    const at = `${wave.x}px ${wave.y}px`
    reveal = document.documentElement.animate(
      { clipPath: [`circle(0px at ${at})`, `circle(${widest}px at ${at})`] },
      { duration: REVEAL_FOR, fill: "both", pseudoElement: "::view-transition-new(root)" },
    )
    reveal.pause()
    follow()
  }).catch(() => {}) // skipped, by a hidden tab or a newer cut: the page has still changed
}
