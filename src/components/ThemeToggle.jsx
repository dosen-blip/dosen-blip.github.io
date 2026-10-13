import { useEffect, useState } from "react"

export const THEME_STORAGE_KEY = "md-theme"

function currentTheme() {
  if (typeof document === "undefined") return "dark"
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

/**
 * Light and dark, as a real version of the toggle from the brand backdrop.
 * The site opens dark; switching to light is remembered.
 */
export function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    // The server renders dark; read the remembered choice once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(currentTheme())
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0c0c0f" : "#f7f5ed")
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable; the switch still applies to this visit.
    }
    setTheme(next)
  }

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Dark mode"
      onClick={toggle}
    >
      <span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-knob" /></span>
    </button>
  )
}
