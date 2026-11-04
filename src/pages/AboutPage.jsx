import { Link } from "react-router-dom"
import { ArrowLink } from "../components/ArrowLink"
import { ButtonLink } from "../components/ButtonLink"
import GlassCard from "../components/GlassCard"
import { Reveal } from "../components/Reveal"
import { ToolIcon } from "../brand/ToolIcon"
import { disciplines } from "../data/disciplines"
import { DESCRIPTOR, DOSEN_URL } from "../data/site"
import "../styles/about.css"

const experience = [
  {
    role: "Creative Director",
    company: "Frequency Shift",
    dates: "2025–present",
    description: "Identity, website and promotional films for an Ottawa house music series. DJ at selected events.",
  },
  {
    role: "Co-Owner and Designer",
    company: "Hinton Publishing",
    dates: "2020–present",
    description: "Book design and typesetting for international sports titles, plus their websites and Shopify stores.",
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
          <p className="lede">I design and build websites and apps, and film and edit video. I’ve worked at HintonX on apps, books and film since 2019, co-own Hinton Publishing, where I design and typeset sports books, and lead creative direction for Frequency Shift, an Ottawa house music series.</p>
          <div className="about-actions">
            <ButtonLink to="/contact">Contact</ButtonLink>
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
            <p className="eyebrow">Disciplines</p>
            <h2 id="what-heading">What I do</h2>
          </div>
          <p>Interface design, front-end development and video production.</p>
        </div>
        <ul className="about-disciplines">
          {disciplines.map((discipline) => (
            <li key={discipline.id}>
              <GlassCard as={Link} to={discipline.path} look={discipline.id}>
                <ToolIcon name={disciplineIcons[discipline.id]} />
                <h3>{discipline.title}</h3>
                <p>{discipline.intro}</p>
                <span className="path">{discipline.path}</span>
              </GlassCard>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section" className="page section about-experience" aria-labelledby="experience-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">2019–present</p>
            <h2 id="experience-heading">Experience</h2>
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
        <GlassCard look="web" className="about-card">
          <h2>Education</h2>
          <p>Studying Graphic Design at Algonquin College in Ottawa, after Business Technology at Concordia University.</p>
        </GlassCard>
        <GlassCard look="ux" className="about-card">
          <h2>Tools</h2>
          <p>Figma and Framer for interfaces, Adobe for print and motion, Shopify for stores, Ableton for music.</p>
          <ArrowLink to="/stack">All tools</ArrowLink>
        </GlassCard>
        <GlassCard look="motion" className="about-card">
          <h2>Music</h2>
          <p>I DJ and produce as DOSEN.</p>
          <ArrowLink to={DOSEN_URL} external>dosen.ca</ArrowLink>
        </GlassCard>
      </Reveal>
    </div>
  )
}
