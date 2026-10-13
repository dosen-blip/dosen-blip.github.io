import { Link } from "react-router-dom"
import { ArrowUpRightIcon } from "./Icons"
import { DisciplineTags } from "./Tags"
import "../styles/project-card-fs.css"

/** Selection handles, as in a design tool, that snap onto a card when you point at it. */
export function SelectionHandles() {
  return <span className="selection-handles" aria-hidden="true"><i /><i /><i /><i /></span>
}

export function ProjectCard({ project, className = "", headingLevel = 3 }) {
  const Heading = `h${headingLevel}`
  const isFrequencyShift = project.slug === "frequency-shift"
  const mediaClassName = [
    "project-card-media",
    project.mediaFit === "contain" ? "project-card-media-fit-contain" : "",
  ].filter(Boolean).join(" ")
  const cardClassName = [
    "project-card",
    isFrequencyShift ? "project-card-frequency-shift" : "",
    className,
  ].filter(Boolean).join(" ")

  return (
    <Link className={cardClassName} to={`/projects/${project.slug}`}>
      <div className="project-card-frame">
        <div
          className={mediaClassName}
          style={project.mediaBackground ? { "--project-media-bg": project.mediaBackground } : undefined}
        >
          {isFrequencyShift ? (
            <>
              <img
                className="frequency-shift-card-backdrop"
                src="/assets/frequency-shift/hero-crowd.webp"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="frequency-shift-card-logo" aria-hidden="true">
                <img className="frequency-shift-card-logo-layer frequency-shift-card-logo-ambient" src={project.cover} alt="" />
                <img className="frequency-shift-card-logo-layer frequency-shift-card-logo-bloom" src={project.cover} alt="" />
                <img className="frequency-shift-card-logo-layer frequency-shift-card-logo-core" src={project.cover} alt="" />
              </span>
            </>
          ) : <img src={project.cover} alt="" loading="lazy" decoding="async" />}
        </div>
        <SelectionHandles />
      </div>
      <div className="project-card-copy">
        <Heading>{project.title}</Heading>
        <span className="project-card-category">{project.category}</span>
        <DisciplineTags ids={project.disciplines} />
        <span className="project-card-arrow" aria-hidden="true"><ArrowUpRightIcon /></span>
      </div>
    </Link>
  )
}
