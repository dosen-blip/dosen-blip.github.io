// When things on a new page should start arriving.
//
// The new page mounts under the cover. Its entrances (sections rising, the header splash, the home pen) wait until the
// cover starts to open, then start as the cover clears the spot they sit on, so the
// motion is handed from the cut to the page instead of stopping dead when the cover leaves (Lusion's page show()).
// With the dot pulse that means content rises in the wake of the trailing edge, nearest the click first.

import { useSyncExternalStore } from "react"
import { transition } from "./transitionStore"
import { PULSE, WAVE, waveOrigin } from "./dots"

const AHEAD = .4 // start this share of a hole's opening before the edge clears, so motion is under way as it shows

function bounds(rect) {
  const left = rect.left ?? rect.x
  const top = rect.top ?? rect.y
  return { left, top, right: left + rect.width, bottom: top + rect.height }
}

/** Seconds after the cover starts opening until it has opened over `rect` (a DOMRect or {x, y, width, height}). */
export function arrivalDelay(rect, width = window.innerWidth, height = window.innerHeight, options = transition.options) {
  if (options.style !== "dots") return 0
  const wave = waveOrigin(width, height, options.origin)
  const box = bounds(rect)
  // The pulse reaches a box at its nearest point to the origin.
  const x = Math.min(Math.max(wave.x, box.left), box.right)
  const y = Math.min(Math.max(wave.y, box.top), box.bottom)
  const n = Math.min(1, Math.hypot(x - wave.x, y - wave.y) / wave.reach)
  if (options.wave) return n * WAVE.travel + WAVE.grow + WAVE.gap + WAVE.shrink * (1 - AHEAD)
  return Math.max(0, n * PULSE.open + PULSE.shrink * (1 - AHEAD))
}

/**
 * Run `arrive` once the cover has opened over `node`, or at once when no cut is opening over the page.
 * `lead` starts it that many seconds early (a video that needs a moment to show its first frame).
 * Something that asks after the cover started opening (a section whose observer fired just after the swap) still waits
 * for the edge to reach it, less the time the edge has already been travelling. Returns a cancel function.
 */
export function afterUncover(node, arrive, { lead = 0 } = {}) {
  let timer = 0
  const wait = (travelled) => {
    const delay = node ? arrivalDelay(node.getBoundingClientRect()) - lead - travelled : 0
    timer = window.setTimeout(arrive, Math.max(0, delay) * 1000)
  }
  if (transition.covering) {
    const stop = transition.on("uncover", () => {
      stop()
      wait(0)
    })
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }
  if (transition.phase === "showing") {
    const { cover, options } = transition
    wait((1 - cover) * options.show - options.uncoverAt)
    return () => window.clearTimeout(timer)
  }
  arrive()
  return () => {}
}

/**
 * Run `arrive` once the cut has finished crossing the whole screen, or at once when none is running. For an entrance worth
 * watching from the start, which `afterUncover` would begin as soon as the pulse clears its own spot. Returns a cancel function.
 */
export function afterCut(arrive) {
  if (!transition.active) {
    arrive()
    return () => {}
  }
  const stop = transition.on("showend", () => {
    stop()
    arrive()
  })
  return stop
}

/** False while a cut covers the page on screen; true once it starts opening, and whenever no cut is running. */
export function useUncovered() {
  return useSyncExternalStore(transition.subscribe, () => !transition.covering, () => true)
}
