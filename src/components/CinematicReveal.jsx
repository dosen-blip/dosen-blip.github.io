import { useEffect, useRef } from "react"

/** A section that rises a little as it scrolls into view (the Frequency Shift and Instinct Groove case studies). */
export function CinematicReveal({ as = "section", className = "", children, delay = 0, ...props }) {
  const ref = useRef(null)
  const Component = as

  useEffect(() => {
    const node = ref.current
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (!node || reduced || typeof IntersectionObserver === "undefined" || typeof node.animate !== "function") return undefined

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.unobserve(node)
      node.animate(
        [
          { opacity: 0.86, transform: "translate3d(0, 24px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 700,
          delay,
          easing: "cubic-bezier(.16, 1, .3, 1)",
          fill: "none",
        },
      )
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" })

    observer.observe(node)
    return () => observer.disconnect()
  }, [delay])

  return <Component ref={ref} className={className} {...props}>{children}</Component>
}
