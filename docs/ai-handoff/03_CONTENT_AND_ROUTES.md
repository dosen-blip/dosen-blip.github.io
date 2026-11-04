# Content, routes and links

## Routes

19 known routes, plus a catch-all 404 (`NotFoundPage.jsx`, `dist/404.html`).

| Route | Module | Contents |
|---|---|---|
| `/` | `HomePage.jsx` | Hero, one glass folder per discipline, selected work |
| `/about` | `AboutPage.jsx` | Intro and portrait, What I do, Experience, Education, Tools and Music cards |
| `/projects` | `ProjectsPage.jsx` | Work: every project, with discipline filters |
| `/web`, `/motion`, `/ux` | `DisciplinePage.jsx` | Building title and intro on a glass pane, the discipline's projects, an extra (Live sites, Selected films, Process), next-discipline links |
| `/stack` | `StackPage.jsx` | Tools: 13 cards in AI Systems & Agents, Design & Development, Creative Production. Linked from About and the footer, not the header |
| `/contact` | `ContactPage.jsx` | Form and details |

## Projects, in display order

| Route under `/projects/` | Title | Client | Disciplines | Page |
|---|---|---|---|---|
| `video-production` | Video Production at HintonX | HintonX / Selected Clients | motion | standard |
| `frequency-shift` | Frequency Shift | Frequency Shift | web, motion | custom |
| `instinct-groove` | Instinct Groove | Instinct Groove | web | custom |
| `trendless` | Trendless | Academic Team Project | ux | standard |
| `animatic-remastered` | Animatic Remastered | Algonquin College | motion | standard |
| `seven-due-dates` | Seven Due Dates | Algonquin College | motion | standard |
| `2024-chasing-greatness` | Chasing Greatness - ECommerce Website | Hinton Publishing | web | standard |
| `novak-books` | Novak Books | Hinton Publishing | none | standard |
| `menu-design` | Restaurant Menu Design | Algonquin College | none | standard |
| `beatport-redesign` | Beatport Redesign | Algonquin College | ux | standard |
| `toldya-tennis` | ToldYa - Tennis Application | HintonX | ux | standard |

Print and book work has no discipline, so it appears only on Work.

## Who Matia is, in the order the site says it

Lead with what Matia makes, then who for, in the order HintonX, Hinton Publishing, Frequency Shift. The home blurb and the About intro both follow this.

- **Home:** "Designer and video editor in Ottawa. I design and build websites and apps, and film and edit video for HintonX, Hinton Publishing and Frequency Shift."
- **Descriptor:** `DESCRIPTOR` in `site.js`, "Web, Motion & UX designer".
- **Music:** Matia DJs and produces as DOSEN, on a separate site, `https://dosen.ca`.

Renaming a discipline: run `scripts/title-outlines.py` if the new title has a letter not in `src/brand/titleGlyphs.js`. A test fails until you do.

## Writing copy

Write plainly, in the first person, and state only what's true. Frequency Shift's body copy was rewritten to remove an AI-sounding voice, so avoid these:

- em dashes as a habit, and "not X, but Y" constructions
- filler words like "energy", "texture" and "the room" used loosely
- abstractions like "visual language" or "continuity between those moments"

Say the same fact once on a page. Prefer less copy: the Instinct page was deliberately cut to a short intro and one line. Don't invent facts about the work. If a sentence is inferred, ask Matia.

Availability is one plain sentence, "Available for design, video and web projects.", in the footer and on Contact. There is no pill.

## Links

`DOSEN_URL`, `EMAIL` and `socialLinks` are in `src/data/site.js`. External links open in a new tab. Static media stays local under `public/assets/`; YouTube, app stores, shops and project sites stay external. Some files in `public/assets/` still have hashed names from the old Framer site.

## SEO

- `metaFor(path)` in `src/utils/seo.js` is the one source of titles: `seo` in a project record, or `pageMeta` in `site.js` for the other pages. The prerender and the tab title both use it.
- The description and share tags are only in the prerendered head, since crawlers load each URL.
- The default share image is `/assets/brand/og-card.png`.
