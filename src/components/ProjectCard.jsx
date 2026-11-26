import { Link } from "react-router-dom"
import { ArrowUpRightIcon } from "./Icons"
import { DisciplineTags } from "./Tags"
import { FrequencyShiftCardArt } from "./FrequencyShiftCardArt"
import { InstinctCardArt } from "./InstinctCardArt"

/** Selection handles, as in a design tool, that snap onto a card when you point at it. */
export function SelectionHandles() {
  return <span className="selection-handles" aria-hidden="true"><i /><i /><i /><i /></span>
}

export function ProjectCard({ project, className = "", headingLevel = 3 }) {
  const Heading = `h${headingLevel}`
  const isFrequencyShift = project.slug === "frequency-shift"
  const isInstinct = project.slug === "instinct-groove"
  const mediaClassName = [
    "project-card-media",
    project.mediaFit === "contain" ? "project-card-media-fit-contain" : "",
  ].filter(Boolean).join(" ")
  const cardClassName = [
    "project-card",
    isFrequencyShift ? "project-card-frequency-shift" : "",
    isInstinct ? "project-card-instinct" : "",
    className,
  ].filter(Boolean).join(" ")

  return (
    <Link className={cardClassName} to={`/projects/${project.slug}`}>
      <div className="project-card-frame">
        <div
          className={mediaClassName}
          style={project.mediaBackground ? { "--project-media-bg": project.mediaBackground } : undefined}
        >
          {isFrequencyShift ? <FrequencyShiftCardArt /> : isInstinct ? <InstinctCardArt /> : <img src={project.cover} alt="" loading="lazy" decoding="async" />}
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
