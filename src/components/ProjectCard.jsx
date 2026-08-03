import { Link } from "react-router-dom"
import { ArrowUpRightIcon } from "./Icons"

export function ProjectCard({ project, className = "" }) {
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
        ) : <img src={project.cover} alt="" />}
      </div>
      <div className="project-card-copy">
        <span>{project.category}</span>
        <h3>{project.title}</h3>
        <span className="project-card-arrow" aria-hidden="true"><ArrowUpRightIcon /></span>
      </div>
    </Link>
  )
}
