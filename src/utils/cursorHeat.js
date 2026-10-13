// How close the pointer is to something glowing blue, from 0 to 1, shared between the backdrop and the cursor.
// Each source reports its own value; the cursor takes the strongest.
const sources = new Map()
let listener = null

export function setCursorHeat(source, value) {
  if (sources.get(source) === value) return
  sources.set(source, value)
  listener?.()
}

export function cursorHeat() {
  let heat = 0
  for (const value of sources.values()) heat = Math.max(heat, value)
  return heat
}

export function onCursorHeat(callback) {
  listener = callback
  return () => { if (listener === callback) listener = null }
}
