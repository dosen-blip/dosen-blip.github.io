// Page transitions, as one store the rest of the app subscribes to.
//
// A navigation covers the old page (hiding), swaps the displayed route while the screen is covered, then uncovers
// the new page (showing). The URL changes the moment a link is clicked; this store only decides when the content
// follows, and how far the cover has travelled, which is what the overlay draws.
//
// It is deliberately React-agnostic: the app subscribes through useTransitionPhase, the overlay through watchFrames,
// and tests drive it with step(dt) instead of requestAnimationFrame.
//
// Each navigation can carry options for the overlay: which cut to draw (`style`), where the click happened
// (`origin`), how long each half takes (`hide`, `show`), and how far into the show the cover actually starts to open
// (`uncoverAt`, for cuts that hold the screen covered for a moment after the swap). A `wave` cut has no covered moment
// at all: the browser has kept a snapshot of the old page (snapshot.js), so the swap runs at once and the cut is one
// long show, with `cover` counting down from 1 as its clock.
//
// The new page mounts under the cover, so its entrances must not start then or they play out unseen and the page
// arrives already still, which reads as a hard cut. `covering` is true from the start of a cut until the cover starts
// to open, and the `uncover` event marks that moment: entrances wait for it (see arrival.js). They are fixed when a transition starts from idle,
// so a second click mid-way changes where the site goes but not how the cover that is already moving looks.

export const HIDE_DURATION = .55
export const SHOW_DURATION = .7
const MAX_FRAME = 1 / 20

const subscribers = new Set()
const frameWatchers = new Set()
const events = { hidestart: new Set(), swap: new Set(), uncover: new Set(), showend: new Set() }

let phase = "idle" // idle | hiding | showing
let cover = 0 // 0: the page is fully visible, 1: fully covered
let pendingSwap = null // what to do once covered; the latest request wins
let options = defaults()
let uncovered = false // whether the cover has started opening on the page now mounted
let frame = 0
let lastTime = 0

function defaults() {
  return { style: "dots", origin: null, hide: HIDE_DURATION, show: SHOW_DURATION, uncoverAt: 0 }
}

function setPhase(next) {
  if (phase === next) return
  phase = next
  notify()
}

function emit(name) {
  for (const handler of events[name]) handler()
}

function notify() {
  for (const subscriber of subscribers) subscriber()
}

function maybeUncover() {
  if (uncovered || phase !== "showing" || (1 - cover) * options.show < options.uncoverAt) return
  uncovered = true
  emit("uncover")
  notify()
}

function swapNow() {
  const swap = pendingSwap
  pendingSwap = null
  uncovered = false // whatever mounts now is under the cover
  swap?.()
  emit("swap")
}

function drawFrame() {
  for (const watch of frameWatchers) watch()
}

function tick(now) {
  frame = 0
  const dt = Math.min((now - lastTime) / 1000, MAX_FRAME)
  lastTime = now
  transition.step(dt)
  if (phase !== "idle") frame = requestAnimationFrame(tick)
}

function schedule() {
  if (frame || typeof requestAnimationFrame === "undefined") return
  lastTime = performance.now()
  frame = requestAnimationFrame(tick)
}

export const transition = {
  get phase() { return phase },
  get cover() { return cover },
  get active() { return phase !== "idle" },
  /** True while the page on screen is (still) under the cover: from the start of a cut until it starts opening. */
  get covering() { return phase !== "idle" && !uncovered },
  /** The options of the transition that is running (or ran last): style, origin, hide, show. */
  get options() { return options },

  /** React subscription: fires when the phase changes. */
  subscribe(notify) {
    subscribers.add(notify)
    return () => subscribers.delete(notify)
  },

  /**
   * hidestart: the cover starts moving. swap: the screen is covered and the content has changed.
   * uncover: the cover starts to open on the new page. showend: the page is fully visible again.
   */
  on(name, handler) {
    events[name].add(handler)
    return () => events[name].delete(handler)
  },

  /** Called once per animation frame while a transition runs, and once when one starts. */
  watchFrames(watch) {
    frameWatchers.add(watch)
    return () => frameWatchers.delete(watch)
  },

  /** Start a transition. `swap` runs when the screen is covered; a request made mid-transition replaces an earlier one. */
  navigate(swap, next = {}) {
    pendingSwap = swap
    if (next.wave) {
      // Nothing to wait for. A wave already running just restarts from wherever the screen has got to.
      options = { ...defaults(), ...next }
      if (phase === "idle") emit("hidestart")
      cover = 1
      swapNow()
      setPhase("showing")
      maybeUncover()
      drawFrame()
      schedule()
    } else if (phase === "idle") {
      options = { ...defaults(), ...next }
      uncovered = false
      emit("hidestart")
      setPhase("hiding")
      drawFrame()
      schedule()
    } else if (phase === "showing") {
      // Interrupted while uncovering: cover the page again from where it is.
      setPhase("hiding")
    }
  },

  /** Advance by dt seconds. */
  step(dt) {
    if (phase === "hiding") {
      cover = Math.min(1, cover + dt / options.hide)
      if (cover === 1) {
        swapNow()
        setPhase("showing")
        maybeUncover()
      }
    } else if (phase === "showing") {
      cover = Math.max(0, cover - dt / options.show)
      maybeUncover()
      if (cover === 0) {
        setPhase("idle")
        emit("showend")
      }
    }
    drawFrame()
  },

  /** Back to idle with nothing pending (tests). */
  reset() {
    if (frame && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(frame)
    frame = 0
    cover = 0
    pendingSwap = null
    options = defaults()
    uncovered = false
    setPhase("idle")
  },
}
