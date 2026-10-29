import { useEffect, useLayoutEffect, useRef } from "react"
import { mountedAfterHydration } from "../utils/hydration"
import { afterUncover } from "../transitions/arrival"

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * A section that rises into place the first time it scrolls into view.
 * The server markup is always visible. Only sections still below the fold are hidden (before they are ever seen),
 * so nothing that was already painted flashes, and the DOM is never re-created.
 * Arriving by a page transition, a section waits for the cut to open over it, so it rises in the cut's wake.
 */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div", ...props }) {
  const ref = useRef(null)

  useBeforePaint(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === "undefined") return undefined
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    // On the first (hydrating) load, anything already on screen was painted by the server: leave it alone.
    if (!mountedAfterHydration() && node.getBoundingClientRect().top < window.innerHeight) return undefined

    node.classList.add("reveal-pending")
    let cancel = () => {}
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      cancel = afterUncover(node, () => node.classList.add("reveal-in"))
    }, { threshold: .08 })
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancel()
    }
  }, [])

  return (
    <Tag ref={ref} className={className} style={delay ? { "--reveal-delay": `${delay}s` } : undefined} {...props}>
      {children}
    </Tag>
  )
}
