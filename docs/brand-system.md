# Design system

The final brand from October 2026, as the site uses it on 2026-11-04 (`25e6dd3`). Change this file when the design changes.

Source: `~/Desktop/Desktop Files/Design & Portfolio/dosen-matia-final-brand/` (PDF, wordmarks, reveal videos, backdrop icons). This replaces the sidebar layout and the dev-only direction switcher.

## Principles from the sheet

- My name first, then the three things I do, then the work. The full name leads; the MD mark only appears where the name can't fit (favicon, app icon, avatar, footer base).
- Mostly beige and near-black. Black is for anything that moves (reveal stages, video posters, the footer end card, the DOSEN button, which inverts to a light pill in dark mode). Blue is for CTAs, the line under the name and one-off interactions.
- Outfit for headings and the descriptor (Medium/SemiBold, Regular for the line under the name). Inter for reading. JetBrains Mono only for paths and code characters.
- A low-opacity dot grid with tools from each field floats behind every page, a few shades off the background.

## Decisions to keep

These come from Matia's feedback on the site. Check against them before adding anything.

- **Reuse before inventing.** New effects are built from what the site already has. A stamped-sprite glow was rejected for looking like "some kind of weird png"; the version that stayed copies the lit backdrop tools. New cards use `GlassCard`, not a look-alike.
- **Take away padding.** Spec rows and label grids that only classify things read as padding, and so do status pills, client lists and side notes. All of these were removed tonight. Add one only if it tells the reader something new.
- **One link per destination.** Put a call to action where the reader expects it, and make it obvious. A link belongs on a card only if it follows from that card: Education has none.
- **Plain copy.** See "Writing copy" in `docs/ai-handoff/03_CONTENT_AND_ROUTES.md`.
- **Own pages keep their own brand.** Frequency Shift and Instinct Groove use their own type and colour, and the portfolio's cards don't apply there.

## Tokens (`src/styles/tokens.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f7f5ed` beige | `#0c0c0f` night | Page |
| `--ink` | `#171916` | `#f7f5ed` | Headings, wordmark |
| `--body` | `#5f625b` grey | `#a6a89f` | Reading text |
| `--accent` | `#386dff` | `#5a86ff` | Descriptor, outlines, handles |
| `--accent-strong` | `#2b5ce6` | `#6f95ff` | Small blue text and filled buttons (AA contrast) |
| `--stage` | `#0c0c0f` | `#000` | Anything that moves |
| `--soft` | `#6b6e66` | `#85877e` | Quiet labels |
| `--surface`, `--surface-2` | `#fbfaf6`, `#efece2` | `#131317`, `#1a1a1f` | Image placeholders, the mobile menu pills |
| `--line`, `--line-strong` | `#dcd8cb`, `#ccc8ba` | `#26262c`, `#34343b` | Hairlines |
| `--neon-on`, `--neon-rgb`, `--neon-core` | `0`, `56 109 255`, the accent | `1`, `92 136 255`, `#e6ecff` | Gates every glow: dark burns like a lit tube, light keeps flat lines |
| `--tool-1/2`, `--dot` | `#bfbaa9` / `#cfcabb`, `#dcd8cb` | `#393940` / `#33333a`, `#1e1e22` | Backdrop |

Type: `--font-display` (Outfit), `--font-body` (Inter), `--font-mono` (JetBrains Mono), sizes `--text-xs` to `--text-lg` and `--title-sm` to `--title-xl`.

Space and shape: `--page-max` 1320px, `--gutter`, `--section`, `--header-h` 72px (60px on phones), `--radius-sm` 8px, `--radius` 14px, `--radius-lg` 22px, `--grid` 30px.

Motion: `--ease`, `--ease-out`, `--ease-snap`, `--fast` .18s, `--mid` .38s, `--slow` .7s.

The PDF lists blue as `#0C0C0F`, which is the dark panel colour; the real blue, `#386DFF`, comes from `wordmark-full.svg`.

Dark mode follows the system until the header toggle sets `data-theme` (remembered in `localStorage["md-theme"]`, applied before first paint in `index.html`).

## Wordmark and reveals

- `src/brand/paths.js` holds the vector wordmark (200 × 28) and MD mark, plus the outline split into shapes with lengths and anchor points.
- `Wordmark` (`src/components/Wordmark.jsx`) draws from a sprite defined once by `BrandSprite`. It is split at the word space so the halves can move. `splash` plays the small header reveal for the page's discipline:
  - `motion` (Pen Tool): stroke draws every shape, then the ink fills.
  - `web` (Decode): the name resolves letter by letter out of code characters.
  - `ux` (Responsive): two lines inside a breakpoint frame, then it reflows to one.
- The header picks the splash from the route (`disciplineForPath`); the end card always draws with the pen when it scrolls into view.
- `HeroLockup` is the full-size lockup on the home page. On every page load (`html[data-intro]`, unless reduced motion) and any return to home inside the app, the pen draws each shape, drops anchors, fills, then the selection box snaps on. Server markup is always the finished mark.
- `RevealStage` plays the After Effects renders (`public/assets/brand/reveals/*.mp4`) on a black stage in a browser frame, with the final frame as a still for reduced motion, blocked autoplay and after the video ends. It is removed from the discipline pages for now, so no page renders it; the component, its CSS, the videos and the `video` and `reveal` fields in `disciplines` remain.

## Glass

Cards and folders share one material: generated art behind frosted glass, with a sheen, a tint, a highlight that follows the cursor, a rim and an edge glow that lights on hover.

- `GlassCard` (`src/components/GlassCard.jsx`, `src/styles/glass-card.css`) is the site's card: About, Contact, Tools, the discipline pages and the project detail rail. `as` sets the root element and `look` picks the art. The tint is heavier than a folder's so text stays legible, at 4.5:1 or better against the brightest art, in both themes. How to use it: `docs/ai-handoff/02_VISUAL_AND_INTERACTIONS.md`.
- `src/data/glassLooks.js` holds the three looks, `web`, `motion` and `ux`, shared with the folders. Web and UX follow the theme; Motion is smoked glass in both. `src/components/glassArt.jsx` paints the art and `src/components/useGlassPointer.js` feeds the cursor.
- `GlassFolder` (`src/components/GlassFolder.jsx`, `src/styles/glass-folder.css`) is the home page's discipline card. Its key is one arrow, a real link (`action="link"`) to the discipline page. `action="add"` gives the plus key, and there is no menu.
- Not on glass, on purpose: `ProjectCard` (image cards with the selection handles below), the Frequency Shift and Instinct pages, and the footer end card, which stays black because it moves. The mobile menu's discipline pills haven't been converted.
- There is no status pill. Availability is a line of text in the footer and on Contact.

## Own-brand pages

- Frequency Shift (`/projects/frequency-shift`) has its own neon look in `src/styles/frequency-shift.css`.
- Instinct Groove (`/projects/instinct-groove`) is black and moss with brand green `#32e07a`, Space Mono labels and the live wall. It is a hero only, with one bright control: the green Visit site button.

## Information architecture

- Header: wordmark · Work · About · Contact · DOSEN (separate music site) · theme toggle.
- Home: hero, the three discipline folders, selected work.
- `/web`, `/motion`, `/ux`: one page per discipline, each opening on its title and intro, listing its projects (`disciplines` in `src/data/projectIndex.js`) and its own extra (live sites, films, process).
- `/projects` is Work: every project, with discipline filters. Print and book work carries no discipline tag.
- `/about`: leads with what Matia makes, then who for, in the same order as the home blurb. Then What I do, Experience, and short Education, Tools and Music cards.
- `/stack` (Tools) is linked from About and the footer rather than the header.

## Interaction vocabulary

- Selection handles (blue outline, square handles) snap onto project cards on hover, sit on the About portrait, and frame the hero lockup with its live size.
- Arrow links swap their arrow; card arrows rotate into a filled blue circle.
- Backdrop tools drift slowly, parallax at 0.22× scroll, and lean away from the cursor with a hint of blue. Discipline pages lean on their own tools.
- Page changes cut through stage black (`src/transitions/`, `TransitionOverlay.jsx`). There is no full-screen hold or name card between pages: the new page forms directly behind the cut. Two cuts:
  - Dot grid (default, and the back button): a pulse runs out from the click through a dot grid twice as fine as the backdrop's, with every second dot on a backdrop dot. Its leading edge swells the dots into black. Its trailing edge opens the black in holes, each a window onto the new page that starts as a blue dot and grows until the windows merge, so the page forms out of the dots. Both edges are rimmed with blue dots. The black carries the same soft light as a lit backdrop tool: a faint neon wash with the backdrop's own tiny dots lit up in it, brightest through the band's middle and kept inside the black. The old page stays up, frozen, ahead of the pulse and the new one is already live behind it, so the screen never goes fully black and only a spot the pulse is crossing is black for an instant. Browsers that cannot keep a snapshot of the old page cover the screen first and then open it, with backdrop tools ahead of the pulse pushed along and lit. A few of the new page's tools spark as it lands.
  - Selection box (project cards and folder sheets): the blue selection frame snaps onto what was clicked and drags out to the screen edges with a live size label, carrying the card's picture with it, so the bridge is the project's image filling the screen under a light black scrim. The picture then fades off the new page while the frame shrinks onto its title or neon wordmark and lets go.
  The new page's entrances (sections rising, the header splash, the home pen) wait under the cover and start as the cut opens over them, so motion hands over from the cut to the page instead of stopping when it leaves. With the dot pulse, content rises in the trailing edge's wake, nearest the click first; with the selection box, the frame rides the rising title and lands where it settles. Hovering, focusing or pressing a link fetches and decodes the media at the top of the page it leads to. The same page asked for again just scrolls to the top.
- Everything respects `prefers-reduced-motion`: reveals show their final frame, splashes are off, the backdrop is still.
