import { Link } from "react-router-dom"
import { ArrowLink } from "../components/ArrowLink"
import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { RevealStage } from "../components/RevealStage"
import { YouTubeBlock } from "../components/ProjectDetail"
import { ArrowUpRightIcon } from "../components/Icons"
import { ToolIcon } from "../brand/ToolIcon"
import { disciplines, getDiscipline } from "../data/disciplines"
import { projectsFor } from "../data/projectIndex"
import videoProduction from "../data/projectRecords/video-production"
import "../styles/discipline.css"

const films = videoProduction.blocks.filter((block) => block.type === "youtube")

const liveSites = [
  { href: "https://frequencyshift.ca/", label: "frequencyshift.ca", note: "Frequency Shift. I direct the identity and build and run the site for every night in the series." },
  { href: "https://2024tennis.com/", label: "2024tennis.com", note: "Chasing Greatness. A Shopify store for Hinton Publishing’s tennis history series." },
  { href: "https://dosen.ca", label: "dosen.ca", note: "DOSEN. The press kit site for my music, kept separate from this one." },
]

const uxSteps = [
  { icon: "cursor", title: "Research", body: "Two personas and a five-person focus group shaped Trendless before anything was drawn." },
  { icon: "selection-box", title: "Audit", body: "Beatport’s redesign started with a full site audit and a style guide." },
  { icon: "toggle", title: "Prototype", body: "Figma wireframes and prototypes for the ToldYa tennis app at HintonX." },
  { icon: "code-tag", title: "Build", body: "Then it gets built, often by me, so the details survive the trip to the browser." },
]

function MotionExtra() {
  return (
    <Reveal as="section" className="page section discipline-extra" aria-labelledby="films-heading">
      <div className="section-head">
        <div>
          <p className="eyebrow">At HintonX, 2019 to now</p>
          <h2 id="films-heading">Selected films</h2>
        </div>
        <ArrowLink to="/projects/video-production">The full video reel</ArrowLink>
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
          <p className="eyebrow">Live right now</p>
          <h2 id="live-heading">On the web</h2>
        </div>
      </div>
      <ul className="live-list">
        {liveSites.map((site) => (
          <li key={site.href}>
            <a href={site.href} target="_blank" rel="noreferrer">
              <code>{site.label}</code>
              <span>{site.note}</span>
              <ArrowUpRightIcon />
            </a>
          </li>
        ))}
        <li className="live-list-self">
          <div>
            <code>matiadosen.com</code>
            <span>This site. Built in React and Vite, with Motion and Lenis. The reveals are After Effects renders; the splash on the header wordmark is code.</span>
          </div>
        </li>
      </ul>
    </Reveal>
  )
}

function UxExtra() {
  return (
    <Reveal as="section" className="page section discipline-extra" aria-labelledby="process-heading">
      <div className="section-head">
        <div>
          <p className="eyebrow">How it runs</p>
          <h2 id="process-heading">From people to pixels</h2>
        </div>
      </div>
      <ol className="ux-steps">
        {uxSteps.map((step, index) => (
          <li key={step.title}>
            <ToolIcon name={step.icon} />
            <span className="ux-step-number">{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
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
        <RevealStage discipline={discipline} priority className="discipline-stage" />
        <div className="discipline-hero-copy">
          <p className="eyebrow"><Link to="/projects">Work</Link> <span aria-hidden="true">/</span> {discipline.label}</p>
          <h1 id="discipline-heading" className="page-title">{discipline.title}</h1>
          <p className="lede">{discipline.intro}</p>
          <div className="discipline-hero-aside">
            <p>{discipline.summary}</p>
            <p className="reveal-note"><strong>{discipline.reveal}</strong> <code>{discipline.path}</code> {discipline.revealNote}</p>
          </div>
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
          <Link key={item.id} to={item.path} className="discipline-next-link">
            <span className="eyebrow">Next <code>{item.path}</code></span>
            <span className="discipline-next-title">{item.title}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
          </Link>
        ))}
      </nav>
    </div>
  )
}
