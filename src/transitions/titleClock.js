// The discipline titles' clock: their builds run on this rather than real time, so they start slowly and pick up speed,
// which lets them begin while the page transition's pulse is still moving without reading as a pop or a wait.

const RAMP = 650 // ms to reach full speed
const START_SPEED = .12
const FULL_SPEED = 1.25

/** How far through a build (ms) we are, `elapsed` real ms after it started. */
export function buildTime(elapsed) {
  if (elapsed <= 0) return 0
  if (elapsed < RAMP) return START_SPEED * elapsed + (FULL_SPEED - START_SPEED) * elapsed ** 2 / (2 * RAMP)
  return buildTime(RAMP - 1e-9) + FULL_SPEED * (elapsed - RAMP)
}

/** How many real ms a build of `duration` ms takes. */
export function realDuration(duration) {
  const ramped = buildTime(RAMP - 1e-9)
  if (duration >= ramped) return RAMP + (duration - ramped) / FULL_SPEED
  const a = (FULL_SPEED - START_SPEED) / (2 * RAMP)
  return (-START_SPEED + Math.sqrt(START_SPEED ** 2 + 4 * a * duration)) / (2 * a)
}
