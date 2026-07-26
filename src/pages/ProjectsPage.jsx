import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { projectIndex } from "../data/projectIndex"
import "../styles/projects.css"

export default function ProjectsPage() {
  return (
    <section className="page-wrap projects-page" aria-labelledby="projects-heading">
      <Reveal className="availability-badge">
        <span className="availability-badge-dot" aria-hidden="true" />
        <span>Available for Work</span>
      </Reveal>

      <div className="projects-index-content">
        <Reveal as="header" className="projects-index-heading">
          <h1 id="projects-heading">
            Projects:<br className="projects-heading-desktop-break" /> Showcasing<br />My Journey
          </h1>
        </Reveal>

        <Reveal className="project-grid projects-index-grid">
          {projectIndex.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
