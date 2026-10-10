import { Link } from "react-router-dom"
import { Reveal } from "../components/Reveal"
import "../styles/about.css"

const education = "I’m studying Graphic Design at Algonquin College in Ottawa. Before that I studied Business Technology at Concordia University."

const stack = "Figma and Framer for interfaces and websites. InDesign, Illustrator and Photoshop for books and print. After Effects for motion, Ableton for music, and Shopify for the stores I manage. I also use AI coding tools for development work."

const experience = [
  {
    role: "Co-Owner and Designer",
    company: "Hinton Publishing",
    dates: "2020–present",
    description: "I design international sports books and their websites, and I manage the Shopify stores that sell them.",
  },
  {
    role: "UX Designer",
    company: "HintonX",
    dates: "2019–present",
    description: "UX design and backend support for the ToldYa tennis app, typesetting for the Novak Books series, and video production: filming, editing, sound and delivery.",
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
          <div className="about-intro">
            <h1>
              Hi, I&apos;m Matia.
            </h1>
            <p>I’m a designer and video editor in Ottawa. I co-own Hinton Publishing, where I design and typeset sports books, and I’ve worked at HintonX since 2019 on apps, books and film. I also run the visuals for Frequency Shift, a house music series, and I DJ and produce music in Ableton.</p>
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
          <AboutLink to="/projects">See the projects</AboutLink>
        </div>
        <div className="about-capability">
          <h2>Tools</h2>
          <p>{stack}</p>
          <AboutLink to="/stack">All tools</AboutLink>
        </div>
      </Reveal>

      <Reveal as="section" className="about-experience">
        <h2>Experience</h2>
        <div className="about-experience-list">
          {experience.map((item) => <ExperienceCard key={item.role} item={item} />)}
        </div>
        <AboutLink to="/contact">Get in touch</AboutLink>
      </Reveal>
    </div>
  )
}
