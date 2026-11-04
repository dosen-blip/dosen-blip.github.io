import { useSyncExternalStore } from "react"
import { transition } from "./transitionStore"

const getPhase = () => transition.phase
const getServerPhase = () => "idle"

/** The current transition phase: idle, hiding or showing. */
export function useTransitionPhase() {
  return useSyncExternalStore(transition.subscribe, getPhase, getServerPhase)
}
