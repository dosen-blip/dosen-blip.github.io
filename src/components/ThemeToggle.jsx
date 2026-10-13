import { useEffect, useState } from "react"

export const THEME_STORAGE_KEY = "md-theme"

function currentTheme() {
  if (typeof document === "undefined") return "light"
  const set = document.documentElement.dataset.theme
  if (set === "light" || set === "dark") return set
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Light and dark, as a real version of the toggle from the brand backdrop.
 * The choice is remembered; until then the site follows the system setting.
 */
export function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    // The server renders light; read the real theme once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(currentTheme())
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setTheme(currentTheme())
    media.addEventListener?.("change", onChange)
    return () => media.removeEventListener?.("change", onChange)
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = next
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
