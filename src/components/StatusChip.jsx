/** The green dot from the brand sheet: an "online" profile state for when I'm taking on work. */
export function StatusChip({ label = "Available for work", tone = "page", className = "" }) {
  return (
    <span className={`status-chip status-chip--${tone} ${className}`.trim()}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
