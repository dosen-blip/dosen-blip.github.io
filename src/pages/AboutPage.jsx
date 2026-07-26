import { Link } from "react-router-dom"
import { Reveal } from "../components/Reveal"
import "../styles/about.css"

const education = "I’m currently pursuing Graphic Design at Algonquin College, Ottawa, deepening my skills in user experience, interactive media, and visual communication. My previous studies in Business Technology at Concordia University have equipped me with strategic insights essential for effective digital design and e-commerce management."

const stack = "I’m skilled across digital platforms, including Figma, Shopify, and the Adobe Creative Suite. My expertise extends to UX/UI design, interactive prototyping, and e-commerce optimization, supported by a solid foundation in visual design principles and AI-enhanced methodologies."

const experience = [
  {
    role: "Co-Owner and Designer",
    company: "Hinton Publishing",
    dates: "2020 - present",
    description: "Working on the visual and UX design of international sports book projects, and managing e-commerce solutions on Shopify.",
  },
  {
    role: "UX Designer",
    company: "HintonX",
    dates: "2019 - Present",
    description: "At Hinton X, I contributed to a range of projects; from UX and backend support for the ToldYa tennis app to typesetting and designing for the Novak Books series. My responsibilities included user experience design, asset management, server setup, and handling detailed typesetting to help bring each project from concept to completion.",
  },
]

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 10h13M11.5 5l5 5-5 5" />
    </svg>
  )
}

function DeviceIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.25" y="3.25" width="11.5" height="9.5" rx="1.25" />
      <path d="M6.25 15.75h3.5M8 12.75v3" />
      <rect x="11.25" y="8.25" width="6.5" height="8.5" rx="1.25" />
      <path d="M13.75 14.75h1.5" />
    </svg>
  )
}

function AboutLink({ to, children }) {
  return (
    <Link className="about-link" to={to}>
      <span>{children}</span>
      <ArrowIcon />
    </Link>
  )
}

function Availability() {
  return (
    <div className="about-availability">
      <span aria-hidden="true" />
      Available for Work
    </div>
  )
}

function ExperienceCard({ item }) {
  return (
    <article className="about-experience-card">
      <div className="about-experience-meta">
        <DeviceIcon />
        <div>
          <h3>{item.role}</h3>
          <p>{item.company}</p>
          <p>{item.dates}</p>
        </div>
      </div>
      <div className="about-experience-copy">
        <p className="about-experience-description">{item.description}</p>
      </div>
    </article>
  )
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <Reveal as="section" className="about-hero">
        <div className="about-hero-content">
          <Availability />
          <div className="about-intro">
            <h1>
              <span className="about-title-desktop">About Me:<br />Crafting Digital<br />Experiences</span>
              <span className="about-title-mobile">About Me:<br />Crafting Digital Excellence</span>
            </h1>
            <p>I’m a UX designer and creative strategist passionate about creating intuitive, user-centered digital experiences. Leveraging expertise in Figma, Adobe Creative Suite, and Shopify, I focus on delivering seamless interactions, visually engaging designs, and innovative solutions driven by AI technology.</p>
          </div>
        </div>

        <picture className="about-portrait">
          <source media="(max-width: 809.98px)" srcSet="/assets/portrait-mobile.png" />
          <img src="/assets/portrait-desktop.png" alt="" />
        </picture>
      </Reveal>

      <Reveal as="section" className="about-capabilities">
        <div className="about-capability">
          <h2>Education</h2>
          <p>{education}</p>
          <AboutLink to="/projects">View Projects</AboutLink>
        </div>
        <div className="about-capability">
          <h2>Stack</h2>
          <p>{stack}</p>
          <AboutLink to="/stack">View Stack</AboutLink>
        </div>
      </Reveal>

      <Reveal as="section" className="about-experience">
        <h2>Experience</h2>
        <div className="about-experience-list">
          {experience.map((item) => <ExperienceCard key={item.role} item={item} />)}
        </div>
        <AboutLink to="/contact">Contact Me</AboutLink>
      </Reveal>
    </div>
  )
}
