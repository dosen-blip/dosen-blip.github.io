import { Link } from "react-router-dom"
import { ArrowRightIcon, ArrowUpRightIcon } from "./Icons"

export function ArrowLink({ to, children, external = false, className = "", ...props }) {
  const Component = external ? "a" : Link
  const externalProps = external ? { href: to, target: "_blank", rel: "noreferrer" } : { to }
  const ArrowIcon = external ? ArrowUpRightIcon : ArrowRightIcon
  return (
    <Component className={`arrow-link ${className}`.trim()} {...externalProps} {...props}>
      <span>{children}</span>
      <span className="arrow-swap" aria-hidden="true">
        <span><ArrowIcon /></span>
        <span><ArrowIcon /></span>
      </span>
    </Component>
  )
}
