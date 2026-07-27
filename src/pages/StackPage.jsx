import "../styles/stack.css"
import { ArrowUpRightIcon } from "../components/Icons"

const stackGroups = [
  {
    id: "ai",
    number: "02",
    title: "AI Systems & Agents",
    summary: "Applied AI workflows spanning agentic development, local inference, research, retrieval, and evaluation.",
    items: [
      {
        name: "OpenAI Codex",
        category: "Agentic Development",
        icon: "/assets/stack-codex.svg",
        href: "https://openai.com/codex/",
        description: "I use Codex for repository-level implementation, code review, browser QA, documentation, and test-driven iteration. My workflows pair autonomous execution with explicit scope, validation gates, and evidence-backed handoffs.",
        tags: ["Implementation", "Code Review", "Browser QA"],
      },
      {
        name: "Claude Code",
        category: "Agentic Development",
        icon: "/assets/stack-claude-code.svg",
        href: "https://claude.com/product/claude-code",
        description: "I use Claude Code for deep codebase analysis, implementation, refactoring, and cross-model review. It is especially useful as a second engineering perspective when testing an approach or pressure-checking technical decisions.",
        tags: ["Codebase Analysis", "Refactoring", "Review"],
      },
      {
        name: "Local LLM Environments",
        category: "Private and Local Inference",
        icon: "/assets/stack-local-llm.svg",
        href: "https://lmstudio.ai/",
        description: "I configure and test local inference environments with LM Studio and open-weight models. This includes model selection, context and runtime configuration, private workflows, structured prompting, and evaluating local performance against hosted systems.",
        tags: ["LM Studio", "Open Models", "Private Inference"],
      },
      {
        name: "Retrieval & Evaluation",
        category: "Grounded AI Systems",
        icon: "/assets/stack-retrieval.svg",
        href: "https://huggingface.co/docs/evaluate/index",
        description: "I work with source-grounded retrieval, reranking, citations, regression datasets, and evaluation gauntlets. The emphasis is on traceable answers, repeatable tests, and knowing when evidence is incomplete rather than filling gaps with assumptions.",
        tags: ["RAG", "Reranking", "Evaluation"],
      },
      {
        name: "Agent Workflow Design",
        category: "Orchestration and Governance",
        icon: "/assets/stack-agent-workflow.svg",
        href: "https://openai.github.io/openai-agents-js/",
        description: "I design agent workflows with clear ownership, bounded subtasks, shared source-of-truth records, review checkpoints, and final integration. This lets multiple agents move quickly without losing accountability or consistency.",
        tags: ["Multi-Agent", "Proof Gates", "Handoffs"],
      },
      {
        name: "AI Research & Reasoning",
        category: "Synthesis and Decision Support",
        icon: "/assets/stack-ai-research.svg",
        href: "https://openai.com/research/",
        description: "I use GPT, Claude, Gemini, and specialist tools for research, synthesis, ideation, and structured decision-making. I compare outputs, verify time-sensitive claims, preserve source authority, and turn findings into practical creative or technical direction.",
        tags: ["GPT", "Claude", "Gemini"],
      },
    ],
  },
  {
    id: "design",
    number: "01",
    title: "Design & Development",
    summary: "The systems I use to move from visual direction to responsive, production-ready digital experiences.",
    items: [
      {
        name: "Framer",
        category: "Interactive Web Design",
        icon: "/assets/cBeIdSP7IRHSWjL1mKUSkzW6sEE.svg",
        href: "https://www.framer.com/",
        description: "I design and prototype responsive web experiences in Framer, using its interaction and layout systems to iterate quickly and move polished concepts toward production.",
        tags: ["Responsive Design", "Prototyping", "Motion"],
      },
      {
        name: "Figma",
        category: "Collaborative Product Design",
        icon: "/assets/ebmQUyXTbBIuqyVlHXTExg4LTo.svg",
        href: "https://www.figma.com/",
        description: "Figma is my primary environment for interface design, visual systems, prototyping, and collaborative iteration with clients and teams.",
        tags: ["UI Systems", "Components", "Collaboration"],
      },
      {
        name: "Adobe Creative Suite",
        category: "Visual Design",
        icon: "/assets/ugncDbmmFCn3ZppafyBFttgmss.png",
        href: "https://www.adobe.com/creativecloud.html",
        description: "I work across Illustrator, InDesign, Photoshop, and After Effects for identity systems, editorial layouts, image-making, and motion graphics.",
        tags: ["Illustrator", "InDesign", "After Effects"],
      },
      {
        name: "Frontend Systems",
        category: "HTML, CSS, JavaScript and React",
        icon: "/assets/ZNEdZ20KrVvoafZDVXvbu69YUUk.svg",
        href: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
        description: "I build accessible, responsive interfaces with semantic HTML, modern CSS, JavaScript, React, and Vite. I focus on reliable layout systems, reusable components, interaction quality, and browser-verified delivery.",
        tags: ["React", "Vite", "Accessibility"],
      },
    ],
  },
  {
    id: "creative",
    number: "03",
    title: "Creative Production",
    summary: "Specialist tools for image finishing, sound, motion, and three-dimensional visual work.",
    items: [
      {
        name: "Topaz AI Suite",
        category: "Image Enhancement",
        icon: "/assets/qURbuRw1dbyzYCFZLJgGfNU4.png",
        href: "https://www.topazlabs.com/",
        description: "I use Topaz for image upscaling, noise reduction, sharpening, and restoration when a visual needs production-ready clarity without losing its character.",
        tags: ["Upscaling", "Restoration", "Finishing"],
      },
      {
        name: "Ableton Live Suite",
        category: "Sound Design and Music",
        icon: "/assets/bTNaxKEIzmFZw2Oc2LloeFuKVnU.png",
        href: "https://www.ableton.com/live/",
        description: "Ableton Live is my core environment for music production, sound design, arrangement, remixing, and preparing polished material for releases and DJ sets.",
        tags: ["Production", "Sound Design", "Performance"],
      },
      {
        name: "Blender",
        category: "3D and Motion",
        icon: "/assets/WDkWwdiLoDea8YzCnoDftwh9f80.png",
        href: "https://www.blender.org/",
        description: "I use Blender to explore modeling, lighting, materials, animation, and dynamic scenes for visual identities, campaigns, and multimedia concepts.",
        tags: ["3D", "Lighting", "Animation"],
      },
    ],
  },
]

const orderedStackGroups = ["design", "ai", "creative"].map((id) => stackGroups.find((group) => group.id === id))

function Availability() {
  return (
    <div className="stack-availability">
      <span aria-hidden="true" />
      Available for Work
    </div>
  )
}

function StackCard({ item }) {
  return (
    <li>
      <a className="stack-card" href={item.href} target="_blank" rel="noopener noreferrer">
        <div className="stack-card-heading">
          <img src={item.icon} alt="" />
          <div>
            <h3>{item.name}</h3>
            <p>{item.category}</p>
          </div>
        </div>
        <p className="stack-card-description">{item.description}</p>
        <ul className="stack-tags" aria-label={`${item.name} capabilities`}>
          {item.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
        <ArrowUpRightIcon className="external-link-icon" />
      </a>
    </li>
  )
}

function StackGroup({ group }) {
  return (
    <section className={`stack-group stack-group-${group.id}`} aria-labelledby={`stack-${group.id}-heading`}>
      <header className="stack-group-heading">
        <span>{group.number}</span>
        <div>
          <h2 id={`stack-${group.id}-heading`}>{group.title}</h2>
          <p>{group.summary}</p>
        </div>
      </header>
      <ul className="stack-grid">
        {group.items.map((item) => <StackCard key={item.name} item={item} />)}
      </ul>
    </section>
  )
}

export default function StackPage() {
  const capabilityCount = orderedStackGroups.reduce((total, group) => total + group.items.length, 0)

  return (
    <section className="page-wrap stack-page" aria-labelledby="stack-heading">
      <Availability />

      <div className="stack-content">
        <header className="stack-hero">
          <p className="stack-hero-kicker">Creative practice / technical fluency</p>
          <h1 id="stack-heading">
            <span className="stack-title-wide">Tools are only useful<br />when they become<br />working systems.</span>
            <span className="stack-title-narrow">Tools become valuable when they become working systems.</span>
          </h1>
          <div className="stack-hero-summary">
            <p>I combine visual design, production craft, frontend development, and applied AI to take ideas from research through execution.</p>
            <dl>
              <div><dt>{capabilityCount}</dt><dd>Capabilities</dd></div>
              <div><dt>{orderedStackGroups.length}</dt><dd>Disciplines</dd></div>
            </dl>
          </div>
        </header>

        <div className="stack-groups">
          {orderedStackGroups.map((group) => <StackGroup key={group.id} group={group} />)}
        </div>
      </div>
    </section>
  )
}
