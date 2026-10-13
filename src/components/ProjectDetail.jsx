import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLink } from "./ArrowLink"
import { ProjectCard } from "./ProjectCard"
import { Reveal } from "./Reveal"
import { DisciplineTags } from "./Tags"
import { SlideDeck } from "./SlideDeck"
import { ArrowLeftIcon, PlayIcon } from "./Icons"
import { projectIndex } from "../data/projectIndex"
import "../styles/detail.css"

const indexBySlug = Object.fromEntries(projectIndex.map((item) => [item.slug, item]))

/** Black stage, blue play button. The privacy-enhanced player only loads once you ask for it. */
export function YouTubeBlock({ id, title }) {
  const [active, setActive] = useState(false)
  if (active) {
    return <div className="youtube-frame"><iframe title={title} src={`https://www.youtube-nocookie.com/embed/${id}`} allow="encrypted-media; picture-in-picture" allowFullScreen /></div>
  }
  return (
    <button className="youtube-poster" type="button" onClick={() => setActive(true)} aria-label={`Play ${title}`}>
      <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy" decoding="async" />
      <span className="youtube-play" aria-hidden="true"><PlayIcon /></span>
    </button>
  )
}

function MetaIcon({ type }) {
  if (type === "client") return <svg viewBox="0 0 20 20"><path d="M4 17h12M6 17V7l4-3 4 3v10M8 9h1m2 0h1m-4 3h1m2 0h1M9 17v-3h2v3" /></svg>
  if (type === "duration") return <svg viewBox="0 0 20 20"><circle cx="10" cy="11" r="6"/><path d="M8 3h4M10 5v2m0 4 2-2"/></svg>
  if (type === "date") return <svg viewBox="0 0 20 20"><rect x="3.5" y="4.5" width="13" height="12" rx="1.5"/><path d="M3.5 8.5h13M7 3v3m6-3v3"/></svg>
  return <svg viewBox="0 0 20 20"><path d="M10 4a6 6 0 1 0 0 12h1.2c.9 0 1.2-1.2.5-1.8-.7-.6-.3-1.7.6-1.7H14a2 2 0 0 0 2-2.2A6 6 0 0 0 10 4Z"/><circle cx="7" cy="9" r=".6"/><circle cx="9.5" cy="7" r=".6"/><circle cx="12.5" cy="8" r=".6"/></svg>
}

function ContentBlock({ block, projectTitle }) {
  if (block.type === "richText") return <section className="prose" dangerouslySetInnerHTML={{ __html: block.html }} />
  if (block.type === "image") return <figure className="detail-figure"><img src={block.src} alt={block.alt || `${projectTitle} project presentation`} loading="lazy" decoding="async" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
  if (block.type === "youtube" && block.description) {
    return (
      <section className="video-showcase" aria-labelledby={`video-${block.id}`}>
        <div className="video-showcase-heading">
          <span className="video-showcase-number">{block.number}</span>
          <div>
            <h2 id={`video-${block.id}`}>{block.title}</h2>
            <p>{block.description}</p>
          </div>
        </div>
        <YouTubeBlock id={block.id} title={block.title} />
      </section>
    )
  }
  if (block.type === "youtube") return <YouTubeBlock id={block.id} title={block.title} />
  if (block.type === "deck") {
    return (
      <section className="media-block" aria-labelledby={`${block.id}-heading`}>
        <div className="media-block-heading">
          <h2 id={`${block.id}-heading`}>{block.title}</h2>
          {block.description && <p>{block.description}</p>}
        </div>
        <SlideDeck deck={block.deck} label={block.title} note={block.note} />
      </section>
    )
  }
  if (block.type === "video") {
    return (
      <section className="media-block" aria-labelledby={`${block.id}-heading`}>
        <div className="media-block-heading">
          <h2 id={`${block.id}-heading`}>{block.title}</h2>
          {block.description && <p>{block.description}</p>}
        </div>
        <figure className="video-block">
          <video src={block.src} poster={block.poster} controls playsInline preload="none" width="1920" height="1098" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      </section>
    )
  }
  if (block.type === "link") return <ArrowLink to={block.href} external>{block.label}</ArrowLink>
  return null
}

const featureTypes = new Set(["deck", "video"])

export function ProjectDetail({ project }) {
  const indexed = indexBySlug[project.slug]
  // Presentations and videos run full width above the write-up; everything else sits beside the details.
  const features = project.blocks.filter((block) => featureTypes.has(block.type))
  const body = project.blocks.filter((block) => !featureTypes.has(block.type))
  const related = project.relatedSlugs.map((slug) => indexBySlug[slug]).filter(Boolean)
  const meta = [
    { type: "client", label: "Client", value: project.client },
    { type: "duration", label: "Duration", value: project.duration },
    { type: "category", label: "Category", value: project.category },
    project.date && { type: "date", label: "Date", value: project.date },
  ].filter(Boolean)

  return (
    <article className={`detail detail--${project.slug}`}>
      <Reveal as="header" className="page detail-head">
        <Link className="back-link" to="/projects"><ArrowLeftIcon /><span>Back to Work</span></Link>
        <p className="eyebrow">{project.category} <span aria-hidden="true">/</span> {project.client}</p>
        <h1 className="page-title">{project.title}</h1>
        {project.summary && <p className="lede">{project.summary}</p>}
        <DisciplineTags ids={indexed?.disciplines} />
      </Reveal>

      {features.length > 0 && (
        <div className="page detail-features">
          {features.map((block) => <Reveal key={block.id}><ContentBlock block={block} projectTitle={project.title} /></Reveal>)}
        </div>
      )}

      <div className="page detail-layout">
        <div className="detail-copy">
          {body.map((block, index) => <Reveal key={`${block.type}-${index}`}><ContentBlock block={block} projectTitle={project.title} /></Reveal>)}
        </div>
        <aside className="detail-rail" aria-label="Project details">
          <dl>
            {meta.map((item) => (
              <div key={item.label}>
                <dt><span className="meta-icon" aria-hidden="true"><MetaIcon type={item.type} /></span>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          {project.liveUrl && <ArrowLink to={project.liveUrl} external className="detail-live">Live website</ArrowLink>}
        </aside>
      </div>

      {project.gallery.length > 0 && (
        <Reveal as="section" className="page detail-gallery" aria-label={`${project.title} gallery`}>
          {project.gallery.map((src, index) => <img key={src} src={src} alt={`${project.title} project view ${index + 1}`} loading="lazy" decoding="async" />)}
        </Reveal>
      )}

      {related.length > 0 && (
        <section className="page section related" aria-labelledby="related-heading">
          <div className="section-head">
            <div><p className="eyebrow">More work</p><h2 id="related-heading">Other projects</h2></div>
            <ArrowLink to="/projects">All work</ArrowLink>
          </div>
          <div className="project-grid">{related.map((item) => <ProjectCard key={item.slug} project={item} />)}</div>
        </section>
      )}
    </article>
  )
}
