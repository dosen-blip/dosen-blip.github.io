import { Link } from "react-router-dom"

export function ArrowLink({ to, children, external = false, className = "", ...props }) {
  const Component = external ? "a" : Link
  const externalProps = external ? { href: to, target: "_blank", rel: "noreferrer" } : { to }
  return (
    <Component className={`arrow-link ${className}`.trim()} {...externalProps} {...props}>
      <span>{children}</span><span className="arrow-swap" aria-hidden="true"><span>↗</span><span>↗</span></span>
    </Component>
  )
}
