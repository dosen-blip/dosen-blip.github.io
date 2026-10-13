// Lets components tell the first (hydrating) render apart from later client-side mounts.
// The first paint already ran its CSS intro from the server markup; later mounts can start their own.
let hydrated = false

export function markHydrated() {
  hydrated = true
}

export function mountedAfterHydration() {
  return typeof window !== "undefined" && hydrated
}
