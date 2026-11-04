const instinctGroove = {
  slug: "instinct-groove",
  layout: "instinct",
  title: "Instinct Groove",
  category: "Web Development / WebGL",
  client: "Instinct Groove",
  duration: "Ongoing",
  date: "2026 — Present",
  location: "Ottawa, Canada",
  cover: "/assets/instinct/card-room.webp",
  gallery: [],
  relatedSlugs: ["frequency-shift", "2024-chasing-greatness", "beatport-redesign"],
  liveUrl: "https://instinctgroove.com/",
  content: {
    hero: {
      kicker: "Web Development / Real-time 3D",
      dek: "I design, build and run instinctgroove.com for Instinct Groove, an Ottawa minimal tech and house series, and built its 3D environment: the wall you’re looking at.",
      still: "/assets/instinct/hero-room.webp",
    },
    about: {
      kicker: "Three.js / WebGL2 / GLSL",
      paragraphs: [
        "The design starts from the anniversary poster: black, the brand green, heavy expanded type, and a cracked concrete wall overgrown with ivy. I built the site by hand in plain JavaScript, with no framework and no build step, so every event, recap and artist page ships straight from GitHub.",
        "The wall is a real-time Three.js scene on WebGL2, with custom GLSL shaders for the concrete, the leaves and the light. The wordmark is carved into the wall and lit from behind, and that glow acts as an area light on the concrete, the ivy and the haze. The ivy hangs on rope physics, the fireflies are moving lights, and the haze and god rays render through HDR buffers before a final grade.",
      ],
    },
  },
  seo: {
    title: "Instinct Groove — Web Development & WebGL by Matia Dosen",
    description: "Design and development of instinctgroove.com for an Ottawa minimal tech and house series, and its real-time 3D environment: the anniversary poster rebuilt as a lit room.",
    image: "/assets/instinct/card-lit.webp",
  },
}

export default instinctGroove
