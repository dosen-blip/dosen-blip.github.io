import { useEffect, useState } from "react"
import { DEFAULT_DIRECTION, directions, readStoredDirection, storeDirection } from "../data/directions"

/**
 * Local comparison tool for the September 2026 design directions.
 * Rendered only in dev builds; production keeps the default direction baked into index.html.
 */
export function DirectionSwitcher() {
  const [current, setCurrent] = useState(() => (typeof window === "undefined" ? DEFAULT_DIRECTION : readStoredDirection()))

  useEffect(() => {
    document.documentElement.dataset.direction = current
  }, [current])

  function choose(id) {
    storeDirection(id)
    setCurrent(id)
  }

  const active = directions.find((direction) => direction.id === current)

  return (
    <div className="direction-switcher" role="group" aria-label="Design direction">
      <span>{active?.label}</span>
      {directions.map((direction) => (
        <button
          key={direction.id}
          type="button"
          title={`${direction.id.toUpperCase()}: ${direction.label}`}
          aria-pressed={direction.id === current}
          onClick={() => choose(direction.id)}
        >
          {direction.id.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
