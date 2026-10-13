import { Link } from "react-router-dom"
import { ArrowLink } from "../components/ArrowLink"
import { ButtonLink } from "../components/ButtonLink"
import { HeroLockup } from "../components/HeroLockup"
import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { RevealStage } from "../components/RevealStage"
import { StatusChip } from "../components/StatusChip"
import { disciplines } from "../data/disciplines"
import { projectIndex, projectsFor } from "../data/projectIndex"
import "../styles/home.css"

const featured = ["video-production", "frequency-shift", "trendless"].map((slug) => projectIndex.find((project) => project.slug === slug))

const proof = [
  { label: "Film and UX", value: "HintonX", since: "since 2019" },
  { label: "Books and web", value: "Hinton Publishing", since: "since 2020" },
  { label: "Creative direction", value: "Frequency Shift", since: "since 2025" },
]

const clients = ["Adobe", "Service Canada", "HintonX", "Hinton Publishing", "Frequency Shift", "Algonquin College"]

export default function HomePage() {
  return (
    <div className="home">
      <section className="page home-hero" aria-label="Introduction">
        <div className="home-hero-top">
          <StatusChip />
          <span className="eyebrow">Ottawa, Canada</span>
        </div>
        <HeroLockup />
        <div className="home-hero-foot">
          <p className="lede">I design it, build it and make it move, start to finish. There’s no hand-off in the middle: the person who designs the interface also writes the code and cuts the video.</p>
          <div className="home-hero-actions">
            <ButtonLink to="/projects">See the work</ButtonLink>
            <ButtonLink to="/contact" variant="ghost">Get in touch</ButtonLink>
          </div>
        </div>
      </section>

      <Reveal as="section" className="page section home-disciplines" aria-labelledby="disciplines-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">Three things I do</p>
            <h2 id="disciplines-heading">Design it, build it, make it move.</h2>
          </div>
          <p>Most projects need more than one of these. I can take a launch from the first interface sketch to the live site and the video that announces it.</p>
        </div>
        <ul className="discipline-grid">
          {disciplines.map((discipline) => (
            <li key={discipline.id}>
              <Link className={`discipline-card discipline-card--${discipline.id}`} to={discipline.path}>
                <RevealStage discipline={discipline} trigger="hover" />
                <div className="discipline-card-copy">
                  <h3>{discipline.title}</h3>
                  <p className="discipline-meta">{discipline.craft}</p>
                  <p>{discipline.intro}</p>
                  <span className="discipline-count">
                    {projectsFor(discipline.id).length} projects
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section" className="page section home-work" aria-labelledby="work-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 id="work-heading">Recent projects</h2>
          </div>
          <ArrowLink to="/projects">All work</ArrowLink>
        </div>
        <div className="home-work-grid">
          <ProjectCard project={featured[0]} className="home-project-card home-project-featured" />
          <div className="home-work-side">
            {featured.slice(1).map((project) => <ProjectCard key={project.slug} project={project} className="home-project-card" />)}
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="page section home-proof" aria-labelledby="proof-heading">
        <div className="home-proof-card">
          <div className="home-proof-copy">
            <p className="eyebrow">Where the work happens</p>
            <h2 id="proof-heading">Seven years of work for real clients, from documentaries to book series.</h2>
            <ArrowLink to="/about">More about me</ArrowLink>
          </div>
          <dl className="home-proof-list">
            {proof.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd><strong>{item.value}</strong><span>{item.since}</span></dd>
              </div>
            ))}
          </dl>
          <div className="home-clients">
            <span className="eyebrow">Made for</span>
            <ul>{clients.map((client) => <li key={client}>{client}</li>)}</ul>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
