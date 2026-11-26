import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLink } from "./ArrowLink"
import { CinematicReveal } from "./CinematicReveal"
import { FilmReel } from "./FilmReel"
import { FrequencyShiftRoom } from "./FrequencyShiftRoom"
import { installGlassLight } from "./fsGlassLight"
import { ArrowLeftIcon, ArrowUpRightIcon } from "./Icons"
import { getProject } from "../data/projects"
import "../styles/frequency-shift.css"
import "../styles/fs-room.css"

const WORDMARK = "/assets/frequency-shift/mobile-fs-wordmark.svg"

// The glass the cursor lights, as on the Frequency Shift site: the panels, the photographs, the browser and the buttons.
const GLASS = ".fs-narrative, .fs-room-body, .fs-dj-aside, .fs-campaign-media, .fs-web-browser, .fs-related-image, .fs-cta"

function ExternalSource({ href, children, className = "" }) {
  return (
    <a className={`fs-source-link ${className}`.trim()} href={href} target="_blank" rel="noreferrer">
      <span>{children}</span>
      <ArrowUpRightIcon />
    </a>
  )
}

function SectionHeading({ eyebrow, title, id }) {
  return (
    <header className="fs-section-heading">
      <p className="fs-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </header>
  )
}

function Narrative({ paragraphs }) {
  return (
    <div className="fs-narrative">
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </div>
  )
}

function FrequencyShiftHeroWordmark({ src, lockupRef }) {
  const overlayRef = useRef(null)
  const activeTimers = useRef(new Set())
  const lastStrike = useRef(new WeakMap())

  useEffect(() => {
    const lockup = lockupRef.current
    const overlay = overlayRef.current
    if (!lockup || !overlay) return undefined

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const coarsePointer = window.matchMedia?.("(hover: none), (pointer: coarse)").matches
    const controller = new AbortController()
    const timers = activeTimers.current

    void fetch(src, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load Frequency Shift wordmark: ${src}`)
        return response.text()
      })
      .then((markup) => {
        const parsed = new DOMParser().parseFromString(markup, "image/svg+xml")
        const svg = parsed.documentElement
        if (svg.tagName.toLowerCase() !== "svg") return
        svg.classList.add("fs-hero-neon-inline-svg")
        svg.setAttribute("aria-hidden", "true")
        overlay.replaceChildren(svg)
        overlay.dataset.interactiveReady = "true"
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          overlay.dataset.interactiveReady = "false"
        }
      })

    if (reducedMotion || coarsePointer) return () => controller.abort()

    let frame = 0
    let lastPointerX = 0
    let lastPointerY = 0
    let lagX = 0
    let lagY = 0
    let trailFadeTimer = 0

    const schedule = (callback, delay) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        callback()
      }, delay)
      timers.add(timer)
    }

    const strike = (path, delay = 0) => {
      const now = performance.now()
      const previousStrike = lastStrike.current.get(path) ?? 0
      if (now - previousStrike < 520) return
      lastStrike.current.set(path, now + delay)

      schedule(() => {
        path.classList.remove("is-proximity-flicker")
        void path.getBoundingClientRect()
        path.classList.add("is-proximity-flicker")
        schedule(() => path.classList.remove("is-proximity-flicker"), 1380)
      }, delay)
    }

    const keepTrailVisible = () => {
      if (trailFadeTimer) {
        window.clearTimeout(trailFadeTimer)
        timers.delete(trailFadeTimer)
        trailFadeTimer = 0
      }
      lockup.classList.add("is-cursor-near")
    }

    const fadeTrail = (delay = 520) => {
      if (trailFadeTimer) return
      trailFadeTimer = window.setTimeout(() => {
        timers.delete(trailFadeTimer)
        trailFadeTimer = 0
        lockup.classList.remove("is-cursor-near")
      }, delay)
      timers.add(trailFadeTimer)
    }

    const updateInteraction = () => {
      frame = 0
      const lockupRect = lockup.getBoundingClientRect()
      const influence = Math.min(210, Math.max(154, lockupRect.width * .135))
      const nearLockup = (
        lastPointerX >= lockupRect.left - influence * 1.55
        && lastPointerX <= lockupRect.right + influence * 1.55
        && lastPointerY >= lockupRect.top - influence * 1.4
        && lastPointerY <= lockupRect.bottom + influence * 1.4
      )

      if (!nearLockup) {
        fadeTrail()
        return
      }

      lagX += (lastPointerX - lockupRect.left - lagX) * .38
      lagY += (lastPointerY - lockupRect.top - lagY) * .38
      lockup.style.setProperty("--fs-neon-cursor-x", `${lagX}px`)
      lockup.style.setProperty("--fs-neon-cursor-y", `${lagY}px`)
      keepTrailVisible()

      const nearbyPaths = [...overlay.querySelectorAll("path")]
        .map((path) => {
          const pathRect = path.getBoundingClientRect()
          const dx = Math.max(pathRect.left - lastPointerX, 0, lastPointerX - pathRect.right)
          const dy = Math.max(pathRect.top - lastPointerY, 0, lastPointerY - pathRect.bottom)
          return { path, distance: Math.hypot(dx, dy) }
        })
        .filter(({ distance }) => distance <= influence)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6)

      nearbyPaths.forEach(({ path, distance }, index) => {
        strike(path, Math.round(index * 78 + (distance / influence) * 46))
      })
    }

    const handlePointerMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      if (!frame) frame = window.requestAnimationFrame(updateInteraction)
    }

    const handlePointerLeave = () => fadeTrail(380)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", handlePointerLeave)

    return () => {
      controller.abort()
      window.removeEventListener("pointermove", handlePointerMove)
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave)
      if (frame) window.cancelAnimationFrame(frame)
      timers.forEach(window.clearTimeout)
      timers.clear()
    }
  }, [src, lockupRef])

  const asset = (
    <img className="fs-hero-neon-asset" src={src} alt="" width="930" height="212" aria-hidden="true" />
  )

  return (
    <h1 ref={lockupRef} className="fs-hero-neon-wordmark">
      <span className="sr-only">Frequency Shift</span>
      <span className="fs-hero-neon-cursor-trail" aria-hidden="true" />
      <span className="fs-hero-neon-layer fs-hero-neon-layer-ambient" aria-hidden="true">{asset}</span>
      <span className="fs-hero-neon-layer fs-hero-neon-layer-bloom" aria-hidden="true">{asset}</span>
      <span className="fs-hero-neon-layer fs-hero-neon-layer-core" aria-hidden="true">
        <span className="fs-hero-neon-interactive-asset">
          {asset}
          <span ref={overlayRef} className="fs-hero-neon-flicker-overlay" />
        </span>
      </span>
    </h1>
  )
}

function BrowserFrame({ src, alt, label, url, className = "" }) {
  return (
    <figure className={`fs-web-browser ${className}`.trim()}>
      <div className="fs-browser-bar" aria-hidden="true">
        <span /><span /><span />
        <p>{url}</p>
      </div>
      <img src={src} alt={alt} width="1280" height="720" loading="lazy" decoding="async" />
      <figcaption>{label}</figcaption>
    </figure>
  )
}

export function FrequencyShiftDetail({ project }) {
  const { content } = project
  const related = project.relatedSlugs.map(getProject).filter(Boolean)
  const liveLabel = project.liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const pageRef = useRef(null)
  const wordmarkRef = useRef(null)
  // "pending" until the page knows whether the room can run, then "loading", "live", or "still" (the photograph)
  const [room, setRoom] = useState("pending")

  useEffect(() => installGlassLight(pageRef.current, GLASS), [])

  return (
    <article ref={pageRef} className="frequency-shift-page page-wrap" data-room={room}>
      {/* The Frequency Shift site's laser room, fixed behind the whole page and lit from behind the wordmark. */}
      <FrequencyShiftRoom pageRef={pageRef} wordmarkRef={wordmarkRef} artwork={WORDMARK} onMode={setRoom} />
      <header className="fs-hero">
        {room === "still" && (
          <>
            <img
              className="fs-hero-image"
              src={content.hero.image}
              alt=""
              width="2400"
              height="1600"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="fs-hero-shade" aria-hidden="true" />
          </>
        )}
        <div className="fs-hero-topline">
          <Link className="fs-back-link" to="/projects"><ArrowLeftIcon /><span>Back to Work</span></Link>
          <div className="fs-hero-links">
            <ExternalSource href={project.liveUrl}>Site</ExternalSource>
            <ExternalSource href={project.instagramUrl}>Instagram</ExternalSource>
          </div>
        </div>
        <div className="fs-hero-wordmark" aria-hidden="true">
          <span>Frequency</span>
          <span>Frequency</span>
          <span>Shift</span>
        </div>
        <div className="fs-hero-copy">
          <p className="fs-hero-kicker">{content.hero.kicker}</p>
          <FrequencyShiftHeroWordmark src={WORDMARK} lockupRef={wordmarkRef} />
          <p className="fs-hero-dek">{content.hero.dek}</p>
        </div>
        <dl className="fs-hero-meta">
          {content.hero.meta.map((item) => (
            <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
          ))}
        </dl>
      </header>

      <CinematicReveal className="fs-section fs-motion" aria-labelledby="fs-motion-title">
        <FilmReel films={content.motion.slots} label="Selected Frequency Shift video work" />
        <div className="fs-section-intro">
          <SectionHeading eyebrow={content.motion.eyebrow} title={content.motion.title} id="fs-motion-title" />
          <Narrative paragraphs={content.motion.paragraphs} />
        </div>
      </CinematicReveal>

      <CinematicReveal className="fs-section fs-overview" aria-labelledby="fs-overview-title">
        <div className="fs-overview-layout">
          <SectionHeading eyebrow={content.overview.eyebrow} title={content.overview.title} id="fs-overview-title" />
          <div className="fs-signal-rule" aria-hidden="true"><span /></div>
          <Narrative paragraphs={content.overview.paragraphs} />
          <p className="fs-brand-annotation">{content.overview.annotation}</p>
        </div>
      </CinematicReveal>

      <CinematicReveal className="fs-section fs-creative" aria-labelledby="fs-creative-title">
        <div className="fs-section-intro">
          <SectionHeading eyebrow={content.creative.eyebrow} title={content.creative.title} id="fs-creative-title" />
          <Narrative paragraphs={content.creative.paragraphs} />
        </div>
        <div className="fs-campaign-heading">
          <p>Selected nights</p>
          <span>05 venue recaps</span>
        </div>
        <div className="fs-campaign-rail" aria-label="Selected Frequency Shift event photography posts" tabIndex="0">
          {content.featuredPosts.map((post) => (
            <a
              key={post.title}
              className="fs-campaign-card"
              href={post.href}
              target="_blank"
              rel="noreferrer"
            >
              <div className="fs-campaign-media">
                <img
                  src={post.src}
                  alt={post.alt}
                  width="376"
                  height="469"
                  loading="lazy"
                  decoding="async"
                  style={post.position ? { objectPosition: post.position } : undefined}
                />
              </div>
              <div className="fs-campaign-copy">
                <div>
                  <span>{post.venue}</span>
                  <h3>{post.title}</h3>
                  <p className="fs-campaign-credit">{post.credit}</p>
                </div>
                <ArrowUpRightIcon />
              </div>
            </a>
          ))}
        </div>
      </CinematicReveal>

      <CinematicReveal className="fs-section fs-web" aria-labelledby="fs-web-title">
        <div className="fs-section-intro">
          <SectionHeading eyebrow={content.web.eyebrow} title={content.web.title} id="fs-web-title" />
          <Narrative paragraphs={content.web.paragraphs} />
          <ArrowLink className="fs-cta" to={project.liveUrl} external>Explore the live platform</ArrowLink>
        </div>
        <div className="fs-web-showcase">
          <BrowserFrame
            src={content.web.homeScreenshot}
            alt="The Frequency Shift homepage: the neon FS sign hanging in a 3D laser room, with For the love of house. under it."
            url={liveLabel}
            label="Live homepage / development and ongoing management"
          />
        </div>
      </CinematicReveal>

      <CinematicReveal className="fs-section fs-room" aria-labelledby="fs-room-title">
        <SectionHeading eyebrow={content.room.eyebrow} title={content.room.title} id="fs-room-title" />
        <p className="fs-room-body">{content.room.body}</p>
        <aside className="fs-dj-aside">
          <span>Also / DJ</span>
          <p>{content.room.dj}</p>
        </aside>
      </CinematicReveal>

      <CinematicReveal className="fs-section fs-closing" aria-labelledby="fs-closing-title">
        <div className="fs-closing-mark" aria-hidden="true">FS</div>
        <SectionHeading eyebrow={content.closing.eyebrow} title={content.closing.title} id="fs-closing-title" />
        <Narrative paragraphs={content.closing.paragraphs} />
        <div className="fs-closing-links">
          <ArrowLink className="fs-cta" to={project.liveUrl} external>Visit Frequency Shift</ArrowLink>
          <ArrowLink className="fs-cta" to={project.instagramUrl} external>Follow on Instagram</ArrowLink>
        </div>
      </CinematicReveal>

      <CinematicReveal className="fs-section fs-related" aria-labelledby="fs-related-title">
        <div className="fs-related-heading">
          <p className="fs-eyebrow">Next / Selected work</p>
          <h2 id="fs-related-title">Keep exploring.</h2>
        </div>
        <div className="fs-related-grid">
          {related.map((item, index) => (
            <Link className="fs-related-card" to={`/projects/${item.slug}`} key={item.slug}>
              <div className="fs-related-image">
                <img src={item.cover} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="fs-related-copy">
                <span>{String(index + 1).padStart(2, "0")} / {item.category}</span>
                <h3>{item.title}</h3>
                <ArrowUpRightIcon />
              </div>
            </Link>
          ))}
        </div>
        <ArrowLink className="fs-cta fs-related-all" to="/projects">All work</ArrowLink>
      </CinematicReveal>
    </article>
  )
}
