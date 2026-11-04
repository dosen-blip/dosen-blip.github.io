import { Link } from "react-router-dom"
import { ArrowLink } from "../components/ArrowLink"
import GlassCard from "../components/GlassCard"
import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { YouTubeBlock } from "../components/ProjectDetail"
import { ArrowUpRightIcon } from "../components/Icons"
import { ToolIcon } from "../brand/ToolIcon"
import { disciplines, getDiscipline } from "../data/disciplines"
import { projectsFor } from "../data/projectIndex"
import videoProduction from "../data/projectRecords/video-production"
import "../styles/discipline.css"

const films = videoProduction.blocks.filter((block) => block.type === "youtube")

const liveSites = [
  { href: "https://frequencyshift.ca/", label: "frequencyshift.ca", note: "Frequency Shift. Event site: design, build and ongoing management." },
  { href: "https://2024tennis.com/", label: "2024tennis.com", note: "Chasing Greatness. Shopify store for Hinton Publishing’s tennis history series." },
  { href: "https://instinctgroove.com/", label: "instinctgroove.com", note: "Instinct Groove. Event site for an Ottawa minimal tech and house series." },
  { href: "https://dosen.ca", label: "dosen.ca", note: "DOSEN. Press kit site for my music." },
  { href: "/", label: "matiadosen.com", note: "Portfolio. Brand identity and site build.", internal: true },
]

const uxSteps = [
  { icon: "cursor", title: "Research", body: "Personas and a five-person focus group (Trendless)." },
  { icon: "selection-box", title: "Audit", body: "Site audit and style guide (Beatport redesign)." },
  { icon: "toggle", title: "Prototype", body: "Figma wireframes and prototypes (ToldYa, HintonX)." },
  { icon: "code-tag", title: "Build", body: "Front-end build or developer handoff." },
]

// Four steps, three looks: neighbours differ in the four, two and one column layouts.
const stepLooks = ["ux", "web", "motion"]

function MotionExtra() {
  return (
    <Reveal as="section" className="page section discipline-extra" aria-labelledby="films-heading">
      <div className="section-head">
        <div>
          <p className="eyebrow">HintonX, 2019–present</p>
          <h2 id="films-heading">Selected films</h2>
        </div>
        <ArrowLink to="/projects/video-production">All films</ArrowLink>
      </div>
      <ul className="film-grid">
        {films.map((film) => (
          <li key={film.id} className="film">
            <YouTubeBlock id={film.id} title={film.title} />
            <p><strong>{film.title}</strong><span>{film.description}</span></p>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

function WebExtra() {
  return (
    <Reveal as="section" className="page section discipline-extra" aria-labelledby="live-heading">
      <div className="section-head">
        <div>
          <p className="eyebrow">Web</p>
          <h2 id="live-heading">Live sites</h2>
        </div>
      </div>
      <ul className="live-list">
        {liveSites.map((site) => {
          const link = site.internal
            ? { as: Link, to: site.href }
            : { as: "a", href: site.href, target: "_blank", rel: "noreferrer" }
          return (
            <li key={site.href}>
              <GlassCard {...link} look="web">
                <code>{site.label}</code>
                <span className="live-note">{site.note}</span>
                <ArrowUpRightIcon />
              </GlassCard>
            </li>
          )
        })}
      </ul>
    </Reveal>
  )
}

function UxExtra() {
  return (
    <Reveal as="section" className="page section discipline-extra" aria-labelledby="process-heading">
      <div className="section-head">
        <div>
          <p className="eyebrow">UX</p>
          <h2 id="process-heading">Process</h2>
        </div>
      </div>
      <ol className="ux-steps">
        {uxSteps.map((step, index) => (
          <GlassCard as="li" key={step.title} look={stepLooks[index % stepLooks.length]}>
            <ToolIcon name={step.icon} />
            <span className="ux-step-number">{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </GlassCard>
        ))}
      </ol>
    </Reveal>
  )
}

const extras = { motion: MotionExtra, web: WebExtra, ux: UxExtra }

export default function DisciplinePage({ id }) {
  const discipline = getDiscipline(id)
  const projects = projectsFor(id)
  const others = disciplines.filter((item) => item.id !== id)
  const Extra = extras[id]

  return (
    <div className={`discipline discipline--${id}`}>
      <section className="page discipline-hero" aria-labelledby="discipline-heading">
        <div className="discipline-hero-copy">
          <p className="eyebrow"><Link to="/projects">Work</Link> <span aria-hidden="true">/</span> {discipline.label}</p>
          <h1 id="discipline-heading" className="page-title">{discipline.title}</h1>
          <p className="lede">{discipline.intro}</p>
        </div>
      </section>

      <Reveal as="section" className="page section" aria-labelledby="discipline-projects">
        <div className="section-head">
          <div>
            <p className="eyebrow">{projects.length} projects</p>
            <h2 id="discipline-projects">{discipline.label} work</h2>
          </div>
        </div>
        <div className="project-grid">
          {projects.map((project) => <ProjectCard key={project.slug} project={project} />)}
        </div>
      </Reveal>

      {Extra && <Extra />}

      <nav className="page section discipline-next" aria-label="Other disciplines">
        {others.map((item) => (
          <GlassCard as={Link} key={item.id} to={item.path} look={item.id} className="discipline-next-link">
            <span className="eyebrow">Next <code>{item.path}</code></span>
            <span className="discipline-next-title">{item.title}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
          </GlassCard>
        ))}
      </nav>
    </div>
  )
}
