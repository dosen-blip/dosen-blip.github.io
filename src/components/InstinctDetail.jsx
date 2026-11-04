import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeftIcon, ArrowUpRightIcon } from "./Icons"
import { InstinctScene } from "./InstinctScene"
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
  const slotRef = useRef(null)
  const moreRef = useRef(null)
  const [mode, setMode] = useState("pending")

  return (
    <article className="instinct-page page-wrap">
      <header className="ig-hero" data-scene={mode}>
        <InstinctScene slotRef={slotRef} moreRef={moreRef} onMode={setMode} />
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
        {/* More of the wall below the first screen, with a word on how it was made. */}
        <div ref={moreRef} className="ig-hero-more">
          <div className="ig-about">
            <h2 className="ig-about-kicker">{content.about.kicker}</h2>
            {content.about.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </header>
    </article>
  )
}
