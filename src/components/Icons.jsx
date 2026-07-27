function Icon({ children, className = "", ...props }) {
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function ArrowUpRightIcon(props) {
  return <Icon {...props}><path d="M7 17 17 7M8 7h9v9" /></Icon>
}

export function ArrowRightIcon(props) {
  return <Icon {...props}><path d="M5 12h14M14 7l5 5-5 5" /></Icon>
}

export function ArrowLeftIcon(props) {
  return <Icon {...props}><path d="M19 12H5M10 7l-5 5 5 5" /></Icon>
}

export function PlayIcon(props) {
  return <Icon {...props}><path className="ui-icon-fill" d="m9 7 8 5-8 5Z" /></Icon>
}

export function FacebookIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 20v-7h2.3l.4-2.8h-2.7V8.4c0-.8.2-1.4 1.4-1.4h1.5V4.5c-.6-.1-1.3-.2-2.2-.2-2.2 0-3.7 1.3-3.7 3.8v2.1H8V13h2.5v7" />
    </Icon>
  )
}

export function InstagramIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle className="ui-icon-fill" cx="17.4" cy="6.7" r="1" />
    </Icon>
  )
}

export function LinkedInIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <circle className="ui-icon-fill" cx="7.5" cy="8" r="1" />
      <path d="M7.5 11v6M11 17v-6m0 2.7c.6-1.8 5.5-2.2 5.5 1.4V17" />
    </Icon>
  )
}
