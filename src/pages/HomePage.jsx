import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useLenis } from "lenis/react"
import { ArrowDownIcon } from "../components/Icons"
import { ArrowLink } from "../components/ArrowLink"
import { ButtonLink } from "../components/ButtonLink"
import { HeroLockup } from "../components/HeroLockup"
import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import GlassFolder from "../components/GlassFolder"
import { InstinctCardArt } from "../components/InstinctCardArt"
import { StatusChip } from "../components/StatusChip"
import { disciplines } from "../data/disciplines"
import { projectIndex, projectsFor } from "../data/projectIndex"
import "../styles/home.css"

const featured = ["video-production", "frequency-shift", "beatport-redesign"].map((slug) => projectIndex.find((project) => project.slug === slug))

const proof = [
  { label: "Film and UX", value: "HintonX", since: "since 2019" },
  { label: "Books and web", value: "Hinton Publishing", since: "since 2020" },
  { label: "Creative direction", value: "Frequency Shift", since: "since 2025" },
]

/**
 * Artwork behind the glass of each folder, in the brand colours: beige, near-black and the blue.
 * Web and UX follow the theme; Motion is always smoked glass over black, because black is for anything that moves.
 */
const folderArt = {
  web: {
    tone: "auto",
    labelPlacement: "bottom-left",
    art: { style: "streak", colors: ["#f7f5ed", "#cfd9f5", "#386dff", "#171916", "#2b4fb8", "#9db6ff", "#f7f5ed"], scale: 0.7, warp: 1.5, angle: -0.6, gloss: 0.2, veins: 0 },
    seed: 7,
  },
  motion: {
    tone: "dark",
    labelPlacement: "bottom-left",
    art: { style: "marble", colors: ["#050507", "#0c0c0f", "#1d2a55", "#171916", "#386dff", "#7fa0ff", "#e6ecff"], scale: 0.62, warp: 3.2, angle: -0.5, gloss: 0.55, veins: 0.6 },
    seed: 11,
  },
  ux: {
    tone: "auto",
    labelPlacement: "bottom-left",
    art: { style: "streak", colors: ["#fbfaf6", "#e4e8f2", "#9db6ff", "#efece2", "#c7d4f7", "#ffffff"], scale: 0.7, warp: 1.6, angle: 0.35, gloss: 0.25, veins: 0 },
    seed: 3,
  },
}

/** The folder fills its column, within reason: the server renders it at 340px and the client measures once mounted. */
function useFolderWidth(min = 240, max = 380) {
  const ref = useRef(null)
  const [width, setWidth] = useState(340)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === "undefined") return undefined
    const fit = () => setWidth(Math.round(Math.min(max, Math.max(min, node.clientWidth))))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    return () => observer.disconnect()
  }, [min, max])
  return [ref, width]
}

/** The Frequency Shift sheet carries the same lit logo as its project card: the crowd behind, the mark in three glowing layers. */
function FrequencyShiftSheet({ project }) {
  return (
    <span className="fs-sheet" aria-hidden="true">
      <img className="fs-sheet-backdrop" src="/assets/frequency-shift/hero-crowd.webp" alt="" loading="lazy" decoding="async" draggable={false} />
      <span className="fs-sheet-logo">
        <img className="fs-sheet-logo-layer fs-sheet-logo-ambient" src={project.cover} alt="" loading="lazy" decoding="async" draggable={false} />
        <img className="fs-sheet-logo-layer fs-sheet-logo-bloom" src={project.cover} alt="" loading="lazy" decoding="async" draggable={false} />
        <img className="fs-sheet-logo-layer fs-sheet-logo-core" src={project.cover} alt="" loading="lazy" decoding="async" draggable={false} />
      </span>
    </span>
  )
}

/** Sheets that carry their project's own lit art rather than a cover image. */
const sheetMedia = {
  "frequency-shift": (project) => <FrequencyShiftSheet project={project} />,
  "instinct-groove": () => <InstinctCardArt variant="sheet" />,
}

/** One discipline as a folder of its projects. Click the glass to fan the projects out; each is a link to its page. */
function DisciplineFolder({ discipline, index }) {
  const navigate = useNavigate()
  const [ref, width] = useFolderWidth()
  const projects = projectsFor(discipline.id)
  const look = folderArt[discipline.id]
  // The first project in display order sits nearest the glass, so the fan reads front to back.
  const files = [...projects].reverse().map((project) => ({
    name: project.title,
    ...(sheetMedia[project.slug]
      ? { media: sheetMedia[project.slug](project) }
      : { image: project.cover, fit: project.mediaFit, background: project.mediaBackground }),
    href: `/projects/${project.slug}`,
  }))
  const go = (path) => (event) => {
    event?.preventDefault()
    navigate(path)
  }

  return (
    <li className={`discipline-folder discipline-folder--${discipline.id}`}>
      <div ref={ref} className="discipline-folder-stage">
        <GlassFolder
          label={discipline.title}
          meta={`${projects.length} projects`}
          description={discipline.intro}
          tone={look.tone}
          art={look.art}
          seed={look.seed}
          labelPlacement={look.labelPlacement}
          files={files}
          action="more"
          menu={[{ label: `All ${discipline.label} projects`, onSelect: () => navigate(discipline.path) }]}
          onFileSelect={(file, _index, event) => go(file.href)(event)}
          openLink={{ label: "All projects", href: discipline.path, onSelect: go(discipline.path) }}
          width={width}
          appearDelay={index * 140}
        />
      </div>
    </li>
  )
}

const clients = ["Adobe", "Service Canada", "HintonX", "Hinton Publishing", "Frequency Shift", "Algonquin College"]

export default function HomePage() {
  const lenis = useLenis()
  const scrollOn = (event) => {
    if (!lenis) return
    event.preventDefault()
    lenis.scrollTo("#disciplines-heading", { offset: -96 })
  }

  return (
    <div className="home">
      <section className="page home-hero" aria-label="Introduction">
        <div className="home-hero-top">
          <StatusChip />
          <span className="eyebrow">Ottawa, Canada</span>
        </div>
        <HeroLockup />
        <div className="home-hero-foot">
          <p className="lede">Designer and video editor in Ottawa. I design and build websites and apps, and film and edit video for HintonX, Hinton Publishing and Frequency Shift.</p>
          <div className="home-hero-actions">
            <ButtonLink to="/projects">View work</ButtonLink>
            <ButtonLink to="/contact" variant="ghost">Contact</ButtonLink>
          </div>
        </div>
        <a className="home-scroll-cue" href="#disciplines-heading" onClick={scrollOn}>
          Scroll <ArrowDownIcon />
        </a>
      </section>

      <Reveal as="section" className="page section home-disciplines" aria-labelledby="disciplines-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">Disciplines</p>
            <h2 id="disciplines-heading">Web, motion and UX</h2>
          </div>
          <p>Projects grouped by discipline. Some, like Frequency Shift, sit in more than one folder.</p>
        </div>
        <ul className="discipline-grid">
          {disciplines.map((discipline, index) => <DisciplineFolder key={discipline.id} discipline={discipline} index={index} />)}
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
            <p className="eyebrow">Experience</p>
            <h2 id="proof-heading">Clients and employers since 2019</h2>
            <ArrowLink to="/about">About</ArrowLink>
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
            <span className="eyebrow">Clients</span>
            <ul>{clients.map((client) => <li key={client}>{client}</li>)}</ul>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
