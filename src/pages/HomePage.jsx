import { Link } from "react-router-dom"
import { ArrowLink } from "../components/ArrowLink"
import { ProjectCard } from "../components/ProjectCard"
import { Reveal } from "../components/Reveal"
import { ArrowUpRightIcon } from "../components/Icons"
import { asset } from "../data/site"
import "../styles/home.css"

const recentProjects = [
  {
    slug: "video-production",
    title: "Video Production at HintonX",
    category: "Film · HintonX",
    cover: asset("video-production-cover.jpg"),
  },
  {
    slug: "frequency-shift",
    title: "Frequency Shift",
    category: "Creative direction · Web · Video",
    cover: "/assets/frequency-shift/fs-icon-vector.svg",
    mediaBackground: "#020102",
  },
  {
    slug: "trendless",
    title: "Trendless",
    category: "UX · Algonquin team project",
    cover: asset("8X7OARkiaVXsQCtwTWOBiMfjFU.png"),
    mediaBackground: "#fcd9d6",
  },
]

const films = [
  { id: "iUXu4dyxbSI", title: "The Legend", note: "Documentary opening sequence" },
  { id: "hYZgGD9qSzY", title: "Creativity in Public Sector", note: "For Adobe" },
  { id: "Kjk2cX7xaNU", title: "The 2024 Tennis Season", note: "Book trailer" },
  { id: "qzKlpU0CvGM", title: "Adobe and Service Canada", note: "Promo" },
]

const stack = [
  {
    name: "Figma",
    detail: "Interfaces and prototypes",
    icon: "ebmQUyXTbBIuqyVlHXTExg4LTo.svg",
    href: "https://www.figma.com/",
  },
  {
    name: "Adobe Creative Suite",
    detail: "Books, identities and motion",
    icon: "ugncDbmmFCn3ZppafyBFttgmss.png",
    href: "https://www.adobe.com/creativecloud.html",
  },
  {
    name: "Framer",
    detail: "Websites",
    icon: "cBeIdSP7IRHSWjL1mKUSkzW6sEE.svg",
    href: "https://www.framer.com/",
  },
  {
    name: "Ableton Live Suite",
    detail: "Music production and DJ sets",
    icon: "bTNaxKEIzmFZw2Oc2LloeFuKVnU.png",
    href: "https://www.ableton.com/live/",
  },
  {
    name: "Blender",
    detail: "3D scenes and lighting",
    icon: "WDkWwdiLoDea8YzCnoDftwh9f80.png",
    href: "https://www.blender.org/",
  },
  {
    name: "Claude Code",
    detail: "Building and reviewing code",
    icon: "stack-claude-code.svg",
    href: "https://claude.com/product/claude-code",
  },
  {
    name: "OpenAI Codex",
    detail: "Building and reviewing code",
    icon: "stack-codex.svg",
    href: "https://openai.com/codex/",
  },
  {
    name: "Local LLM Environments",
    detail: "Running models privately",
    icon: "stack-local-llm.svg",
    href: "https://lmstudio.ai/",
  },
]

export default function HomePage() {
  return (
    <div className="page-wrap home-page">
      <Reveal as="section" className="home-hero">
        <div className="home-folio" aria-hidden="true">
          <span>Selected work, 2019–2026</span>
          <span>Updated September 2026</span>
        </div>
        <div className="home-intro">
          <p className="home-kicker">Now: HintonX · Hinton Publishing · Frequency Shift</p>
          <h1><span>Designer &amp; video editor</span><br /><em>in Ottawa.</em></h1>
          <p>I&apos;ve shot and edited films at HintonX since 2019, designed and typeset sports books at Hinton Publishing since 2020, and I run the visuals for Frequency Shift, an Ottawa house series. I&apos;m studying Graphic Design at Algonquin College.</p>
        </div>
        <ArrowLink className="home-action" to="/about">More about me</ArrowLink>
      </Reveal>

      <Reveal as="section" className="home-section home-projects">
        <div className="section-heading"><span>01 / Selected work</span><h2>Recent projects</h2></div>
        <div className="home-project-grid">
          <ProjectCard project={recentProjects[0]} className="home-project-card home-project-featured" />
          <div className="home-project-side">
            {recentProjects.slice(1).map((project) => (
              <ProjectCard key={project.slug} project={project} className="home-project-card" />
            ))}
          </div>
        </div>
        <ArrowLink className="home-action" to="/projects">All projects</ArrowLink>
      </Reveal>

      <Reveal as="section" className="home-section home-video-production">
        <div className="section-heading"><span>02 / Film</span><h2>Video production at HintonX</h2></div>
        <div className="home-video-production-layout">
          <ul className="home-film-grid" aria-label="Selected films">
            {films.map((film) => (
              <li key={film.id}>
                <Link to="/projects/video-production">
                  <img src={`https://i.ytimg.com/vi/${film.id}/maxresdefault.jpg`} alt="" loading="lazy" />
                  <span><strong>{film.title}</strong><small>{film.note}</small></span>
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <p>I shoot, edit, mix and deliver documentary, brand, sports and public-sector films for HintonX and its clients, including Adobe.</p>
            <ArrowLink className="home-action" to="/projects/video-production">Watch the films</ArrowLink>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="home-section home-stack">
        <div className="section-heading"><span>03 / Tools</span><h2>What I work in</h2></div>
        <div className="home-stack-grid">
          {stack.map((item) => (
            <a className="home-stack-card" href={item.href} target="_blank" rel="noreferrer" key={item.name}>
              <img src={asset(item.icon)} alt="" />
              <span><strong>{item.name}</strong><small>{item.detail}</small></span>
              <ArrowUpRightIcon className="external-link-icon" />
            </a>
          ))}
        </div>
        <ArrowLink className="home-action" to="/stack">All tools</ArrowLink>
      </Reveal>
    </div>
  )
}
