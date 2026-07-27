import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLink } from "./ArrowLink"
import { ProjectCard } from "./ProjectCard"
import { Reveal } from "./Reveal"
import { getProject } from "../data/projects"

function YouTubeBlock({ id, title }) {
  const [active, setActive] = useState(false)
  if (active) {
    return <div className="youtube-frame"><iframe title={title} src={`https://www.youtube-nocookie.com/embed/${id}`} allow="encrypted-media; picture-in-picture" allowFullScreen /></div>
  }
  return (
    <button className="youtube-poster" type="button" onClick={() => setActive(true)} aria-label={`Play ${title}`}>
      <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" /><span aria-hidden="true">▶</span>
    </button>
  )
}

function MetaIcon({ type }) {
  if (type === "client") return <svg viewBox="0 0 20 20"><path d="M4 17h12M6 17V7l4-3 4 3v10M8 9h1m2 0h1m-4 3h1m2 0h1M9 17v-3h2v3" /></svg>
  if (type === "duration") return <svg viewBox="0 0 20 20"><circle cx="10" cy="11" r="6"/><path d="M8 3h4M10 5v2m0 4 2-2"/></svg>
  return <svg viewBox="0 0 20 20"><path d="M10 4a6 6 0 1 0 0 12h1.2c.9 0 1.2-1.2.5-1.8-.7-.6-.3-1.7.6-1.7H14a2 2 0 0 0 2-2.2A6 6 0 0 0 10 4Z"/><circle cx="7" cy="9" r=".6"/><circle cx="9.5" cy="7" r=".6"/><circle cx="12.5" cy="8" r=".6"/></svg>
}

function ContentBlock({ block, projectTitle }) {
  if (block.type === "richText") return <section className="rich-text" dangerouslySetInnerHTML={{ __html: block.html }} />
  if (block.type === "image") return <figure><img src={block.src} alt={block.alt || `${projectTitle} project presentation`} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
  if (block.type === "youtube" && block.description) {
    return (
      <section className="video-showcase" aria-labelledby={`video-${block.id}`}>
        <div className="video-showcase-heading">
          <span>{block.number}</span>
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
  if (block.type === "link") return <ArrowLink to={block.href} external>{block.label}</ArrowLink>
  return null
}

export function ProjectDetail({ project }) {
  const related = project.relatedSlugs.map(getProject).filter(Boolean)
  return (
    <article className={`detail-page detail-page--${project.slug} page-wrap`}>
      <Reveal as="header" className="detail-heading">
        <Link className="back-link" to="/projects">←&nbsp; Back to Projects</Link>
        <span className="detail-kicker">{project.category} / {project.client}</span>
        <h1>{project.title}</h1>
        <p className="detail-dek">{project.summary || `A ${project.category.toLowerCase()} project created for ${project.client} over ${project.duration.toLowerCase()}.`}</p>
      </Reveal>
      <div className="detail-layout">
        <div className="detail-copy">
          {project.blocks.map((block, index) => <Reveal key={`${block.type}-${index}`}><ContentBlock block={block} projectTitle={project.title} /></Reveal>)}
        </div>
        <aside className="detail-rail">
          <dl>
            <div><dt><span className="meta-icon" aria-hidden="true"><MetaIcon type="client" /></span>Client</dt><dd>{project.client}</dd></div>
            <div><dt><span className="meta-icon" aria-hidden="true"><MetaIcon type="duration" /></span>Duration</dt><dd>{project.duration}</dd></div>
            <div><dt><span className="meta-icon" aria-hidden="true"><MetaIcon type="category" /></span>Category</dt><dd>{project.category}</dd></div>
            {project.date && <div><dt>Date</dt><dd>{project.date}</dd></div>}
          </dl>
          {project.liveUrl && <ArrowLink to={project.liveUrl} external>Live Website</ArrowLink>}
        </aside>
      </div>
      {project.gallery.length > 0 && (
        <Reveal as="section" className="detail-gallery" aria-label={`${project.title} gallery`}>
          {project.gallery.map((src, index) => <img key={src} src={src} alt={`${project.title} project view ${index + 1}`} />)}
        </Reveal>
      )}
      {related.length > 0 && <section className="related"><h2>Other Projects</h2><div className="project-grid">{related.map((item) => <ProjectCard key={item.slug} project={item} />)}</div><ArrowLink to="/projects">All Projects</ArrowLink></section>}
    </article>
  )
}
