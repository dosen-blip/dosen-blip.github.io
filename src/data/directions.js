export const DEFAULT_DIRECTION = "b"
export const DIRECTION_STORAGE_KEY = "md-direction"

export const directions = [
  { id: "a", label: "Editorial" },
  { id: "b", label: "Work-led" },
  { id: "d", label: "Paper" },
]

const ids = new Set(directions.map((direction) => direction.id))

export function readStoredDirection() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("direction")
    if (ids.has(fromUrl)) {
      window.localStorage.setItem(DIRECTION_STORAGE_KEY, fromUrl)
      return fromUrl
    }
    const stored = window.localStorage.getItem(DIRECTION_STORAGE_KEY)
    return ids.has(stored) ? stored : DEFAULT_DIRECTION
  } catch {
    return DEFAULT_DIRECTION
  }
}

export function storeDirection(id) {
  try {
    window.localStorage.setItem(DIRECTION_STORAGE_KEY, id)
  } catch {
    // Storage can be unavailable in private windows; the switch still applies for this view.
  }
}
