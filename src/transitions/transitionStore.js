// Page transitions, as one store the rest of the app subscribes to.
//
// A navigation covers the old page (hiding), swaps the displayed route while the screen is covered, then uncovers
// the new page (showing). The URL changes the moment a link is clicked; this store only decides when the content
// follows, and how far the cover has travelled, which is what the overlay draws.
//
// It is deliberately React-agnostic: the app subscribes through useTransitionPhase, the overlay through watchFrames,
// and tests drive it with step(dt) instead of requestAnimationFrame.

export const HIDE_DURATION = .55
export const SHOW_DURATION = .7
const MAX_FRAME = 1 / 20

const subscribers = new Set()
const frameWatchers = new Set()
const events = { hidestart: new Set(), swap: new Set(), showend: new Set() }

let phase = "idle" // idle | hiding | showing
let cover = 0 // 0: the page is fully visible, 1: fully covered
let pendingSwap = null // what to do once covered; the latest request wins
let frame = 0
let lastTime = 0

function setPhase(next) {
  if (phase === next) return
  phase = next
  for (const notify of subscribers) notify()
}

function emit(name) {
  for (const handler of events[name]) handler()
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

  /** React subscription: fires when the phase changes. */
  subscribe(notify) {
    subscribers.add(notify)
    return () => subscribers.delete(notify)
  },

  /** hidestart: the cover starts moving. swap: the screen is covered and the content has changed. showend: the page is fully visible again. */
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
  navigate(swap) {
    pendingSwap = swap
    if (phase === "idle") {
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
      cover = Math.min(1, cover + dt / HIDE_DURATION)
      if (cover === 1) {
        const swap = pendingSwap
        pendingSwap = null
        swap?.()
        emit("swap")
        setPhase("showing")
      }
    } else if (phase === "showing") {
      cover = Math.max(0, cover - dt / SHOW_DURATION)
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
    setPhase("idle")
  },
}
