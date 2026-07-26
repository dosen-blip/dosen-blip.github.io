import { useEffect, useRef, useState } from "react"
import { NavLink, Link } from "react-router-dom"
import { navItems } from "../data/routes"
import { asset, socialLinks } from "../data/site"

function NavIcon({ name }) {
  if (name === "home") return <svg viewBox="0 0 24 24"><path d="m4 10 8-7 8 7v10h-6v-6h-4v6H4Z" /></svg>
  if (name === "about") return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-5 3.3-7.5 7.5-7.5s6.7 2.5 7.5 7.5"/></svg>
  if (name === "projects") return <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="1"/><path d="M9 7V4h6v3M9 10v10M15 10v10"/></svg>
  if (name === "stack") return <svg viewBox="0 0 24 24"><path d="m3 9 9-6 9 6-9 6Z"/><path d="m3 13 9 6 9-6"/></svg>
  return <svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4.5 7 7.5 5.5L19.5 7"/></svg>
}

function NavList({ onNavigate }) {
  return (
    <nav aria-label="Primary">
      {navItems.map((item, index) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={onNavigate}>
          <span className="nav-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className="nav-icon" aria-hidden="true"><NavIcon name={item.icon} /></span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function Socials() {
  return (
    <div className="socials" aria-label="Social links">
      <a className="facebook" href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook"><span aria-hidden="true">f</span></a>
      {socialLinks.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}><span aria-hidden="true">{link.label === "Instagram" ? "◎" : "in"}</span><span className="social-label">{link.label}</span></a>)}
    </div>
  )
}

function DosenButton() {
  return (
    <a
      className="dosen-button"
      href="https://dosen.ca"
      target="_blank"
      rel="noreferrer"
      aria-label="Visit DOSEN"
    >
      <span className="dosen-icon-window" aria-hidden="true">
        <svg className="dosen-icon dosen-icon-disco" viewBox="0 0 24 24">
          <path d="M12 2v3M9.5 2h5M5 8l-1.5-1.5M19 8l1.5-1.5" />
          <circle cx="12" cy="13" r="7" />
          <path d="M5 13h14M12 6c-2.2 2-3.1 4.3-3.1 7s.9 5 3.1 7M12 6c2.2 2 3.1 4.3 3.1 7s-.9 5-3.1 7" />
        </svg>
        <svg className="dosen-icon dosen-icon-disco-filled" viewBox="0 0 24 24">
          <path d="M12 2v3M9.5 2h5M5 8l-1.5-1.5M19 8l1.5-1.5" />
          <circle cx="12" cy="13" r="7" />
          <path className="dosen-disco-fill" d="M5 13h14a7 7 0 0 1-14 0Z" />
          <path d="M5 13h14M12 6c-2.2 2-3.1 4.3-3.1 7s.9 5 3.1 7M12 6c2.2 2 3.1 4.3 3.1 7s-.9 5-3.1 7" />
        </svg>
      </span>
      <span className="dosen-wordmark-window" aria-hidden="true">
        <img className="dosen-wordmark dosen-wordmark-outline" src={asset("8w0l0Gui033mioUQjzI6JOUa6f4.png")} alt="" />
        <img className="dosen-wordmark dosen-wordmark-filled" src={asset("LRpJWtcLJyxTvUVMYNlxsHXRA.png")} alt="" />
      </span>
    </a>
  )
}

export function SiteShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const buttonRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen)
    if (!menuOpen) return undefined
    const onKey = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.documentElement.classList.remove("menu-open")
    }
  }, [menuOpen])

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-edition" aria-hidden="true">
          <span>PORTFOLIO</span>
          <span>2026 / V1</span>
        </div>
        <div className="profile-lockup">
          <Link to="/" className="avatar-link" aria-label="Matia Dosen, home"><img src={asset("avatar.png")} alt="Matia Dosen" /></Link>
          <div><strong>Matia Dosen</strong><span>Designer / Creative</span></div>
        </div>
        <NavList />
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span aria-hidden="true" />Available for selected work</div>
          <DosenButton />
          <Socials />
        </div>
      </aside>

      <header className="mobile-header">
        <div className="profile-lockup">
          <Link to="/" className="avatar-link" aria-label="Matia Dosen, home"><img src={asset("avatar.png")} alt="Matia Dosen" /></Link>
          <div><strong>Matia Dosen</strong><span>Designer / Creative</span></div>
        </div>
        <button ref={buttonRef} className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <span /><span />
        </button>
      </header>
      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <NavList onNavigate={() => setMenuOpen(false)} />
        <div className="mobile-menu-bottom">
          <DosenButton />
          <Socials />
        </div>
      </div>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div>
          <span>MATIA DOSEN / 2026</span>
          <span>DESIGNING BETWEEN CLARITY &amp; CULTURE</span>
          <a href="mailto:matiadosen@outlook.com">START A CONVERSATION ↗</a>
        </div>
      </footer>
    </>
  )
}
