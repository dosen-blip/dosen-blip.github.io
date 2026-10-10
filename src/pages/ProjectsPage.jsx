import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { projectIndex } from "../data/projectIndex"
import "../styles/projects.css"

export default function ProjectsPage() {
  return (
    <section className="page-wrap projects-page" aria-labelledby="projects-heading">
      <div className="projects-index-content">
        <Reveal as="header" className="projects-index-heading">
          <h1 id="projects-heading">
            Projects
          </h1>
          <p>Film, books, interfaces and identities, 2019–2026. Client work for HintonX, Hinton Publishing and Frequency Shift, and coursework from Algonquin College.</p>
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
