import { useLayoutEffect } from "react"
import { useLocation } from "react-router-dom"
import { useLenis } from "lenis/react"

export function RouteScrollReset() {
  const location = useLocation()
  const lenis = useLenis()

  useLayoutEffect(() => {
    lenis?.stop()
    window.scrollTo(0, 0)
    lenis?.scrollTo(0, { immediate: true, force: true })
    lenis?.start()
  }, [lenis, location.key, location.pathname])

  return null
}
