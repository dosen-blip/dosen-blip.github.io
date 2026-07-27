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
    category: "FILM / MOTION",
    cover: asset("video-production-cover.jpg"),
  },
  {
    slug: "trendless",
    title: "Trendless",
    category: "UI / UX",
    cover: asset("8X7OARkiaVXsQCtwTWOBiMfjFU.png"),
  },
  {
    slug: "animatic-remastered",
    title: "Animatic Remastered",
    category: "ACADEMIC PROJECT",
    cover: asset("didBAU6tFaNthCNwaTxWiqYyQnU.png"),
  },
]

const stack = [
  {
    name: "Framer",
    detail: "Interactive Web Design",
    icon: "cBeIdSP7IRHSWjL1mKUSkzW6sEE.svg",
    href: "https://www.framer.com/",
  },
  {
    name: "Figma",
    detail: "Collaborative Product Design",
    icon: "ebmQUyXTbBIuqyVlHXTExg4LTo.svg",
    href: "https://www.figma.com/",
  },
  {
    name: "OpenAI Codex",
    detail: "Agentic Development",
    icon: "stack-codex.svg",
    href: "https://openai.com/codex/",
  },
  {
    name: "Claude Code",
    detail: "Agentic Development",
    icon: "stack-claude-code.svg",
    href: "https://claude.com/product/claude-code",
  },
  {
    name: "Adobe Creative Suite",
    detail: "Visual Design and Motion",
    icon: "ugncDbmmFCn3ZppafyBFttgmss.png",
    href: "https://www.adobe.com/creativecloud.html",
  },
  {
    name: "Ableton Live Suite",
    detail: "Music Production and Sound Design",
    icon: "bTNaxKEIzmFZw2Oc2LloeFuKVnU.png",
    href: "https://www.ableton.com/live/",
  },
  {
    name: "Local LLM Environments",
    detail: "Private and Local Inference",
    icon: "stack-local-llm.svg",
    href: "https://lmstudio.ai/",
  },
  {
    name: "Retrieval & Evaluation",
    detail: "Grounded AI Systems",
    icon: "stack-retrieval.svg",
    href: "https://huggingface.co/docs/evaluate/index",
  },
]

export default function HomePage() {
  return (
    <div className="page-wrap home-page">
      <Reveal as="section" className="home-hero">
        <div className="home-folio" aria-hidden="true">
          <span>INDEPENDENT PORTFOLIO</span>
          <span>OTTAWA, CANADA</span>
        </div>
        <div className="availability"><span aria-hidden="true" />Available for Work</div>
        <div className="home-intro">
          <p className="home-kicker">UX DESIGN · CREATIVE DIRECTION · DIGITAL EXPERIENCES</p>
          <h1><span>Clear thinking.</span><br /><em>Distinctive outcomes.</em></h1>
          <p>I'm an aspiring creative with a passion for video editing, motion graphics, UX/UI Design, E-Commerce, music production, and DJing.</p>
        </div>
        <ArrowLink className="home-action" to="/about">More about Me</ArrowLink>
      </Reveal>

      <Reveal as="section" className="home-section home-projects">
        <div className="section-heading"><span>01 / SELECTED WORK</span><h2>Recent Projects</h2></div>
        <div className="home-project-grid">
          <ProjectCard project={recentProjects[0]} className="home-project-card home-project-featured" />
          <div className="home-project-side">
            {recentProjects.slice(1).map((project) => (
              <ProjectCard key={project.slug} project={project} className="home-project-card" />
            ))}
          </div>
        </div>
        <ArrowLink className="home-action" to="/projects">All Projects</ArrowLink>
      </Reveal>

      <Reveal as="section" className="home-section home-video-production">
        <div className="section-heading"><span>02 / VIDEO PRODUCTION</span><h2>Stories built from first frame to final delivery.</h2></div>
        <div className="home-video-production-layout">
          <img src={asset("video-production-cover.jpg")} alt="" />
          <div>
            <p>I lead filming, photography, editing, sound, and final production for documentary, brand, sports, public-sector, and product stories through HintonX.</p>
            <ArrowLink className="home-action" to="/projects/video-production">Watch the selected work</ArrowLink>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="home-section home-stack">
        <div className="section-heading"><span>03 / CAPABILITIES</span><h2>Working Stack</h2></div>
        <div className="home-stack-grid">
          {stack.map((item) => (
            <a className="home-stack-card" href={item.href} target="_blank" rel="noreferrer" key={item.name}>
              <img src={asset(item.icon)} alt="" />
              <span><strong>{item.name}</strong><small>{item.detail}</small></span>
              <ArrowUpRightIcon className="external-link-icon" />
            </a>
          ))}
        </div>
        <ArrowLink className="home-action" to="/stack">All Stack</ArrowLink>
      </Reveal>
    </div>
  )
}
