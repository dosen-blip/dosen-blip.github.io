import { Link } from "react-router-dom"
import { ArrowLink } from "../components/ArrowLink"
import { ButtonLink } from "../components/ButtonLink"
import { Reveal } from "../components/Reveal"
import { StatusChip } from "../components/StatusChip"
import { ToolIcon } from "../brand/ToolIcon"
import { disciplines } from "../data/disciplines"
import { DESCRIPTOR, DOSEN_URL } from "../data/site"
import "../styles/about.css"

const education = "I’m studying Graphic Design at Algonquin College in Ottawa. Before that I studied Business Technology at Concordia University."

const stack = "Figma and Framer for interfaces and websites. InDesign, Illustrator and Photoshop for books and print. After Effects for motion, Ableton for music, and Shopify for the stores I manage. I also use AI coding tools for development work."

const experience = [
  {
    role: "Creative Director",
    company: "Frequency Shift",
    dates: "2025–present",
    description: "The identity, the website and the announcement and recap films for an Ottawa house series. I also play selected nights.",
  },
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

const disciplineIcons = { web: "code-tag", motion: "pen-nib", ux: "cursor" }

export default function AboutPage() {
  return (
    <div className="about">
      <Reveal as="section" className="page about-hero" aria-labelledby="about-heading">
        <div className="about-intro">
          <p className="eyebrow">About</p>
          <h1 id="about-heading" className="page-title">Hi, I&apos;m Matia.</h1>
          <p className="descriptor about-descriptor">{DESCRIPTOR}, in Ottawa.</p>
          <p className="lede">I co-own Hinton Publishing, where I design and typeset sports books, and I’ve worked at HintonX since 2019 on apps, books and film. I also run the visuals for Frequency Shift, a house music series, and I DJ and produce music in Ableton.</p>
          <div className="about-actions">
            <StatusChip />
            <ButtonLink to="/contact">Get in touch</ButtonLink>
          </div>
        </div>

        <figure className="about-portrait">
          <span className="about-portrait-frame">
            <picture>
              <source media="(max-width: 809.98px)" srcSet="/assets/portrait-mobile.png" />
              <img src="/assets/portrait-desktop.png" alt="Matia Dosen" />
            </picture>
            <span className="selection-handles is-on" aria-hidden="true"><i /><i /><i /><i /></span>
          </span>
          <figcaption className="about-cursor" aria-hidden="true">
            <ToolIcon name="cursor" />
            <span>matia</span>
          </figcaption>
        </figure>
      </Reveal>

      <Reveal as="section" className="page section about-what" aria-labelledby="what-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">What I do</p>
            <h2 id="what-heading">One person, start to finish.</h2>
          </div>
          <p>The person who designs the interface also writes the code and cuts the video. Nothing gets lost in a hand-off, because there isn’t one.</p>
        </div>
        <ul className="about-disciplines">
          {disciplines.map((discipline) => (
            <li key={discipline.id}>
              <Link to={discipline.path}>
                <ToolIcon name={disciplineIcons[discipline.id]} />
                <h3>{discipline.title}</h3>
                <p>{discipline.intro}</p>
                <span className="path">{discipline.path}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section" className="page section about-experience" aria-labelledby="experience-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">Experience</p>
            <h2 id="experience-heading">Where I work</h2>
          </div>
        </div>
        <ol className="experience-list">
          {experience.map((item) => (
            <li key={item.company}>
              <span className="experience-dates">{item.dates}</span>
              <div>
                <h3>{item.role}</h3>
                <p className="experience-company">{item.company}</p>
              </div>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal as="section" className="page section about-more">
        <div className="about-card">
          <h2>Education</h2>
          <p>{education}</p>
          <ArrowLink to="/projects">See the work</ArrowLink>
        </div>
        <div className="about-card">
          <h2>Tools</h2>
          <p>{stack}</p>
          <ArrowLink to="/stack">All tools</ArrowLink>
        </div>
        <div className="about-card about-card--night">
          <h2>Music</h2>
          <p>I DJ and produce as DOSEN. It has its own site, separate from this one.</p>
          <ArrowLink to={DOSEN_URL} external>dosen.ca</ArrowLink>
        </div>
      </Reveal>
    </div>
  )
}
