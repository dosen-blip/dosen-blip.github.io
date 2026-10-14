import { useSyncExternalStore } from "react"

const query = "(prefers-reduced-motion: reduce)"

function subscribe(callback) {
  const media = window.matchMedia(query)
  media.addEventListener?.("change", callback)
  return () => media.removeEventListener?.("change", callback)
}

/** True when the visitor asks for reduced motion. The server (and hydration) assume motion is fine. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
