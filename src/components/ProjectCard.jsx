import { Link } from "react-router-dom"

export function ProjectCard({ project, className = "" }) {
  const mediaClassName = [
    "project-card-media",
    project.mediaFit === "contain" ? "project-card-media-fit-contain" : "",
  ].filter(Boolean).join(" ")

  return (
    <Link className={`project-card ${className}`.trim()} to={`/projects/${project.slug}`}>
      <div
        className={mediaClassName}
        style={project.mediaBackground ? { "--project-media-bg": project.mediaBackground } : undefined}
      >
        <img src={project.cover} alt="" />
      </div>
      <div className="project-card-copy">
        <span>{project.category}</span>
        <h3>{project.title}</h3>
        <i className="project-card-arrow" aria-hidden="true">↗</i>
      </div>
    </Link>
  )
}
