import "../styles/stack.css"
import { ArrowUpRightIcon } from "../components/Icons"

const stackGroups = [
  {
    id: "ai",
    number: "03",
    title: "AI Systems & Agents",
    summary: "AI tools for development and research.",
    items: [
      {
        name: "OpenAI Codex",
        category: "Coding agent",
        icon: "/assets/stack-codex.svg",
        href: "https://openai.com/codex/",
        description: "Implementation, code review and browser testing in existing repositories.",
        tags: ["Implementation", "Code Review", "Browser QA"],
      },
      {
        name: "Claude Code",
        category: "Coding agent",
        icon: "/assets/stack-claude-code.svg",
        href: "https://claude.com/product/claude-code",
        description: "Codebase analysis, refactoring and a second review of technical decisions.",
        tags: ["Codebase Analysis", "Refactoring", "Review"],
      },
      {
        name: "Local LLM Environments",
        category: "Local models",
        icon: "/assets/stack-local-llm.svg",
        href: "https://lmstudio.ai/",
        description: "Open-weight models run locally in LM Studio for private work, compared against hosted models.",
        tags: ["LM Studio", "Open Models", "Private Inference"],
      },
      {
        name: "Retrieval & Evaluation",
        category: "Retrieval",
        icon: "/assets/stack-retrieval.svg",
        href: "https://huggingface.co/docs/evaluate/index",
        description: "Retrieval with citations and reranking, and regression tests for answer quality.",
        tags: ["RAG", "Reranking", "Evaluation"],
      },
      {
        name: "Agent Workflow Design",
        category: "Orchestration",
        icon: "/assets/stack-agent-workflow.svg",
        href: "https://openai.github.io/openai-agents-js/",
        description: "Multi-agent workflows with defined tasks, review checkpoints and a shared record of decisions.",
        tags: ["Multi-Agent", "Proof Gates", "Handoffs"],
      },
      {
        name: "AI Research & Reasoning",
        category: "Research",
        icon: "/assets/stack-ai-research.svg",
        href: "https://openai.com/research/",
        description: "Research and synthesis with GPT, Claude and Gemini, with claims checked against sources.",
        tags: ["GPT", "Claude", "Gemini"],
      },
    ],
  },
  {
    id: "design",
    number: "01",
    title: "Design & Development",
    summary: "Interface, web and print design.",
    items: [
      {
        name: "Framer",
        category: "Web design",
        icon: "/assets/cBeIdSP7IRHSWjL1mKUSkzW6sEE.svg",
        href: "https://www.framer.com/",
        description: "Responsive website design, prototyping and publishing.",
        tags: ["Responsive Design", "Prototyping", "Motion"],
      },
      {
        name: "Figma",
        category: "Interface design",
        icon: "/assets/ebmQUyXTbBIuqyVlHXTExg4LTo.svg",
        href: "https://www.figma.com/",
        description: "Interface design, design systems, prototypes and client review.",
        tags: ["UI Systems", "Components", "Collaboration"],
      },
      {
        name: "Adobe Creative Suite",
        category: "Visual design",
        icon: "/assets/ugncDbmmFCn3ZppafyBFttgmss.png",
        href: "https://www.adobe.com/creativecloud.html",
        description: "Illustrator, InDesign, Photoshop and After Effects for identity, print layout, image editing and motion.",
        tags: ["Illustrator", "InDesign", "After Effects"],
      },
      {
        name: "Frontend Systems",
        category: "HTML, CSS, JavaScript and React",
        icon: "/assets/ZNEdZ20KrVvoafZDVXvbu69YUUk.svg",
        href: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
        description: "Responsive, accessible interfaces in HTML, CSS, JavaScript and React, built with Vite.",
        tags: ["React", "Vite", "Accessibility"],
      },
    ],
  },
  {
    id: "creative",
    number: "02",
    title: "Creative Production",
    summary: "Music, 3D and image finishing.",
    items: [
      {
        name: "Topaz AI Suite",
        category: "Image finishing",
        icon: "/assets/qURbuRw1dbyzYCFZLJgGfNU4.png",
        href: "https://www.topazlabs.com/",
        description: "Upscaling, noise reduction, sharpening and restoration for images.",
        tags: ["Upscaling", "Restoration", "Finishing"],
      },
      {
        name: "Ableton Live Suite",
        category: "Music",
        icon: "/assets/bTNaxKEIzmFZw2Oc2LloeFuKVnU.png",
        href: "https://www.ableton.com/live/",
        description: "Music production, sound design, remixes and DJ set preparation.",
        tags: ["Production", "Sound Design", "Performance"],
      },
      {
        name: "Blender",
        category: "3D",
        icon: "/assets/WDkWwdiLoDea8YzCnoDftwh9f80.png",
        href: "https://www.blender.org/",
        description: "3D modelling, lighting, materials and animation.",
        tags: ["3D", "Lighting", "Animation"],
      },
    ],
  },
]

const orderedStackGroups = ["design", "creative", "ai"].map((id) => stackGroups.find((group) => group.id === id))

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
  return (
    <section className="page stack-page" aria-labelledby="stack-heading">
      <div className="stack-content">
        <header className="stack-hero">
          <p className="eyebrow">Tools</p>
          <h1 id="stack-heading" className="page-title">What I work in</h1>
          <p className="lede">Software used for design, video, music and development.</p>
        </header>

        <div className="stack-groups">
          {orderedStackGroups.map((group) => <StackGroup key={group.id} group={group} />)}
        </div>
      </div>
    </section>
  )
}
