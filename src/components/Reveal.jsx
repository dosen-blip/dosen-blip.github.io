import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

const motionTags = {
  div: motion.div,
  header: motion.header,
  section: motion.section,
  article: motion.article,
}

export function Reveal({ children, className = "", delay = 0, as = "div" }) {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // SSR must remain visible; remounting after hydration starts the entrance.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  const Component = motionTags[as] || motion.div
  return (
    <Component
      key={mounted ? "motion" : "static"}
      className={className}
      initial={!mounted || reduced ? false : { opacity: 0, y: 48 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ type: "spring", stiffness: 200, damping: 60, delay }}
    >
      {children}
    </Component>
  )
}
