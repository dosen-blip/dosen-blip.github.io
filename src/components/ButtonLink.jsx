import { Link } from "react-router-dom"
import { ArrowRightIcon, ArrowUpRightIcon } from "./Icons"

/** Filled blue for the one action that matters on a screen; outlined for the rest. */
export function ButtonLink({ to, children, variant = "primary", external = false, className = "" }) {
  const Icon = external ? ArrowUpRightIcon : ArrowRightIcon
  const classes = `button button--${variant} ${className}`.trim()
  const content = <><span>{children}</span><Icon /></>
  if (external || to.startsWith("mailto:")) {
    return <a className={classes} href={to} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{content}</a>
  }
  return <Link className={classes} to={to}>{content}</Link>
}
