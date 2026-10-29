import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLink } from "./ArrowLink"
import { CinematicReveal } from "./CinematicReveal"
import { ArrowLeftIcon, ArrowUpRightIcon } from "./Icons"
import { InstinctScene } from "./InstinctScene"
import { getProject } from "../data/projects"
import "../styles/instinct.css"

const WORDMARK = "/assets/instinct/scene/wordmark.svg"

function SourceLink({ href, children }) {
  return (
    <a className="ig-source-link" href={href} target="_blank" rel="noreferrer">
      <span>{children}</span>
      <ArrowUpRightIcon />
    </a>
  )
}

function SectionHeading({ eyebrow, title, id }) {
  return (
    <header className="ig-section-heading">
      <p className="ig-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </header>
  )
}

function Narrative({ paragraphs }) {
  return (
    <div className="ig-narrative">
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
  )
}

/**
 * The wordmark's place in the copy. With the live scene it stays empty: the wordmark is carved into the wall behind it,
 * landing exactly on this box. Over the still it is lettered here instead, backlit like the sign.
 */
function HeroWordmark({ slotRef }) {
  return (
    <h1 className="ig-hero-wordmark">
      <span className="sr-only">Instinct Groove</span>
      <span ref={slotRef} className="ig-wordmark-slot" aria-hidden="true">
        <span className="ig-wordmark-sign ig-wordmark-sign--haze"><span style={{ "--ig-mark": `url(${WORDMARK})` }} /></span>
        <span className="ig-wordmark-sign ig-wordmark-sign--face"><span style={{ "--ig-mark": `url(${WORDMARK})` }} /></span>
      </span>
    </h1>
  )
}

export function InstinctDetail({ project }) {
  const { content } = project
  const related = project.relatedSlugs.map(getProject).filter(Boolean)
  const liveLabel = project.liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const slotRef = useRef(null)
  const [mode, setMode] = useState("pending")

  return (
    <article className="instinct-page page-wrap">
      <header className="ig-hero" data-scene={mode}>
        <InstinctScene slotRef={slotRef} onMode={setMode} />
        {mode === "still" && (
          <img className="ig-hero-still" src={content.hero.still} alt="" width="1600" height="828" decoding="async" fetchPriority="high" />
        )}
        <div className="ig-hero-shade" aria-hidden="true" />
        <div className="ig-hero-topline">
          <Link className="ig-back-link" to="/projects"><ArrowLeftIcon /><span>Back to Work</span></Link>
          <div className="ig-hero-links">
            <SourceLink href={project.liveUrl}>Site</SourceLink>
          </div>
        </div>
        <div className="ig-hero-copy">
          <p className="ig-hero-kicker">{content.hero.kicker}</p>
          <HeroWordmark slotRef={slotRef} />
          <p className="ig-hero-dek">{content.hero.dek}</p>
        </div>
        <dl className="ig-hero-meta">
          {content.hero.meta.map((item) => (
            <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
          ))}
        </dl>
      </header>

      <CinematicReveal className="ig-section ig-build" aria-labelledby="ig-build-title">
        <div className="ig-build-intro">
          <SectionHeading eyebrow={content.build.eyebrow} title={content.build.title} id="ig-build-title" />
          <Narrative paragraphs={content.build.paragraphs} />
          <ArrowLink className="ig-cta ig-build-link" to={project.liveUrl} external>Visit {liveLabel}</ArrowLink>
        </div>
      </CinematicReveal>

      <CinematicReveal className="ig-section ig-related" aria-labelledby="ig-related-title">
        <div className="ig-related-heading">
          <p className="ig-eyebrow">Next / Selected work</p>
          <h2 id="ig-related-title">Keep exploring.</h2>
        </div>
        <div className="ig-related-grid">
          {related.map((item, index) => (
            <Link className="ig-related-card" to={`/projects/${item.slug}`} key={item.slug}>
              <div className="ig-related-image">
                <img src={item.cover} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="ig-related-copy">
                <span>{String(index + 1).padStart(2, "0")} / {item.category}</span>
                <h3>{item.title}</h3>
                <ArrowUpRightIcon />
              </div>
            </Link>
          ))}
        </div>
        <ArrowLink className="ig-cta ig-related-all" to="/projects">All work</ArrowLink>
      </CinematicReveal>
    </article>
  )
}
