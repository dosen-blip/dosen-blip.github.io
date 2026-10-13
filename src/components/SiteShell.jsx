import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useLenis } from "lenis/react"
import { navItems } from "../data/routes"
import { DESCRIPTOR, DOSEN_URL, EMAIL, asset, socialLinks } from "../data/site"
import { disciplineForPath, disciplines } from "../data/disciplines"
import { projectDisciplines } from "../data/projectIndex"
import { ArrowUpRightIcon, InstagramIcon, LinkedInIcon } from "./Icons"
import { BrandBackdrop } from "./BrandBackdrop"
import { NeonCursor } from "./NeonCursor"
import { BrandSprite, MDMark, Wordmark } from "./Wordmark"
import { ThemeToggle } from "./ThemeToggle"
import { StatusChip } from "./StatusChip"

function isActive(item, pathname) {
  return item.matches.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function NavLinks({ pathname, onNavigate, className = "" }) {
  return (
    <nav className={className} aria-label="Primary">
      {navItems.map((item) => {
        const active = isActive(item, pathname)
        return (
          <Link key={item.to} to={item.to} onClick={onNavigate} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** My music lives on its own site; this is the separate button that takes you there. */
function DosenButton() {
  return (
    <a className="dosen-button" href={DOSEN_URL} target="_blank" rel="noreferrer" aria-label="Visit DOSEN">
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
      <ArrowUpRightIcon className="dosen-arrow" />
    </a>
  )
}

const socialIcons = { Instagram: InstagramIcon, LinkedIn: LinkedInIcon }

function Socials({ className = "" }) {
  return (
    <div className={`socials ${className}`.trim()} aria-label="Social links">
      {socialLinks.map((link) => {
        const SocialIcon = socialIcons[link.label]
        return (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}>
            <SocialIcon /><span className="social-label">{link.label}</span>
          </a>
        )
      })}
    </div>
  )
}

/** The site closes the way my videos do: on an end card with the wordmark. It draws itself when it comes into view. */
function EndCard() {
  const ref = useRef(null)
  const [drawn, setDrawn] = useState(false)
  const lenis = useLenis()

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setDrawn(true)
      observer.disconnect()
    }, { threshold: .5 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function backToTop(event) {
    event.preventDefault()
    if (lenis) lenis.scrollTo(0)
    else window.scrollTo({ top: 0 })
  }

  return (
    <footer className="site-footer">
      <div className="page">
        <div className="end-card">
          <div className="end-card-lockup" ref={ref}>
            <Link to="/" aria-label="Matia Dosen, home" className="end-card-name">
              <Wordmark key={drawn ? "drawn" : "rest"} splash={drawn ? "motion" : null} />
            </Link>
            <p className="descriptor">{DESCRIPTOR}.</p>
          </div>

          <div className="end-card-cta">
            <StatusChip tone="stage" />
            <p>Available for design, video and web projects.</p>
            <a className="end-card-email" href={`mailto:${EMAIL}`}>
              <span>{EMAIL}</span><ArrowUpRightIcon />
            </a>
          </div>

          <nav className="end-card-links" aria-label="Footer">
            <div>
              <h2>Work</h2>
              <ul>
                {disciplines.map((discipline) => <li key={discipline.id}><Link to={discipline.path}>{discipline.title}</Link></li>)}
                <li><Link to="/projects">All work</Link></li>
              </ul>
            </div>
            <div>
              <h2>Info</h2>
              <ul>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/stack">Tools</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h2>Links</h2>
              <ul>
                {socialLinks.map((link) => <li key={link.label}><a href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRightIcon /></a></li>)}
                <li><a href={DOSEN_URL} target="_blank" rel="noreferrer">DOSEN (music)<ArrowUpRightIcon /></a></li>
              </ul>
            </div>
          </nav>

          <div className="end-card-base">
            <MDMark label="Matia Dosen" />
            <span>© 2026 Matia Dosen · Ottawa, Canada</span>
            <a href="#top" className="end-card-top" onClick={backToTop}>Back to top</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function SiteShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const buttonRef = useRef(null)
  const { pathname } = useLocation()
  const discipline = disciplineForPath(pathname, projectDisciplines)
  const isHome = pathname === "/"
  // The Frequency Shift case study is a dark page; the header reverses to match it.
  const night = pathname === "/projects/frequency-shift"

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

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <BrandSprite />
      <BrandBackdrop discipline={discipline} />
      <NeonCursor />

      <header className={`site-header${menuOpen ? " is-menu-open" : ""}${night ? " is-night" : ""}`} id="top">
        <div className="page site-header-inner">
          <Link to="/" className="header-logo" aria-label="Matia Dosen, home" onClick={closeMenu}>
            <Wordmark key={pathname} splash={isHome ? null : discipline} />
          </Link>
          <NavLinks pathname={pathname} className="header-nav" />
          <div className="header-actions">
            <DosenButton />
            <ThemeToggle />
          </div>
          <button
            ref={buttonRef}
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" /><span aria-hidden="true" />
          </button>
        </div>
      </header>

      <div id="mobile-menu" className={`mobile-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="page mobile-menu-inner">
          <NavLinks pathname={pathname} onNavigate={closeMenu} className="mobile-nav" />
          <div className="mobile-disciplines" aria-label="Work by discipline">
            {disciplines.map((item) => (
              <Link key={item.id} to={item.path} onClick={closeMenu} aria-current={discipline === item.id && pathname === item.path ? "page" : undefined}>
                <span className="path">{item.path}</span>{item.label}
              </Link>
            ))}
          </div>
          <div className="mobile-menu-bottom">
            <StatusChip />
            <div className="mobile-menu-row">
              <DosenButton />
              <ThemeToggle />
            </div>
            <Socials />
          </div>
        </div>
      </div>

      <main id="main-content" tabIndex={-1}>{children}</main>
      <EndCard key={pathname} />
    </>
  )
}
