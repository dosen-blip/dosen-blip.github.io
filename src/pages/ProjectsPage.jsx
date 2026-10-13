import { Link } from "react-router-dom"
import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { disciplines } from "../data/disciplines"
import { projectIndex, projectsFor } from "../data/projectIndex"
import "../styles/work.css"

const otherWork = projectIndex.filter((project) => project.disciplines.length === 0)

export default function ProjectsPage() {
  return (
    <section className="page work" aria-labelledby="projects-heading">
      <Reveal as="header" className="work-head">
        <p className="eyebrow">Work, 2019–2026</p>
        <h1 id="projects-heading" className="page-title">Work</h1>
        <p className="lede">Films, websites, apps and books. Client work for HintonX, Hinton Publishing and Frequency Shift, and coursework from Algonquin College.</p>
        <nav className="work-filter" aria-label="Work by discipline">
          <Link to="/projects" aria-current="page">All <span>{projectIndex.length}</span></Link>
          {disciplines.map((discipline) => (
            <Link key={discipline.id} to={discipline.path}>
              {discipline.label} <span>{projectsFor(discipline.id).length}</span>
            </Link>
          ))}
        </nav>
      </Reveal>

      <Reveal className="project-grid work-grid">
        {projectIndex.map((project) => <ProjectCard key={project.slug} project={project} headingLevel={2} />)}
      </Reveal>

      {otherWork.length > 0 && (
        <p className="work-note">
          Print and books, like {otherWork.map((project) => project.title).join(" and ")}, sit outside the three disciplines but use the same eye for type.
        </p>
      )}
    </section>
  )
}
