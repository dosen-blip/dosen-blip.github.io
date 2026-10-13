# Brand system (final brand, October 2026)

Source: `~/Desktop/Desktop Files/Design & Portfolio/dosen-matia-final-brand/` (PDF, wordmarks, reveal videos, backdrop icons). This replaces the sidebar layout and the dev-only direction switcher.

## Principles from the sheet

- My name first, then the three things I do, then the work. The full name leads; the MD mark only appears where the name can't fit (favicon, app icon, avatar, footer base).
- Mostly beige and near-black. Black is for anything that moves (reveal stages, video posters, the footer end card, the DOSEN button). Blue is for CTAs, the line under the name and one-off interactions. Green is only the "available" status dot.
- Outfit for headings and the descriptor (Medium/SemiBold, Regular for the line under the name). Inter for reading. JetBrains Mono only for paths and code characters.
- A low-opacity dot grid with tools from each field floats behind every page, a few shades off the background.

## Tokens (`src/styles/tokens.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f7f5ed` beige | `#0c0c0f` night | Page |
| `--ink` | `#171916` | `#f7f5ed` | Headings, wordmark |
| `--body` | `#5f625b` grey | `#a6a89f` | Reading text |
| `--accent` | `#386dff` | `#5a86ff` | Descriptor, outlines, handles |
| `--accent-strong` | `#2b5ce6` | `#6f95ff` | Small blue text and filled buttons (AA contrast) |
| `--online` | `#0f9b60` | same | Status dot |
| `--stage` | `#0c0c0f` | `#000` | Anything that moves |
| `--tool-1/2`, `--dot` | `#ccc8ba` / `#dcd8cb` | `#2a2a2f` / `#1e1e22` | Backdrop |

The PDF lists blue as `#0C0C0F`, which is the dark panel colour; the real blue, `#386DFF`, comes from `wordmark-full.svg`.

Dark mode follows the system until the header toggle sets `data-theme` (remembered in `localStorage["md-theme"]`, applied before first paint in `index.html`).

## Wordmark and reveals

- `src/brand/paths.js` holds the vector wordmark (200 × 28) and MD mark, plus the outline split into shapes with lengths and anchor points.
- `Wordmark` (`src/components/Wordmark.jsx`) draws from a sprite defined once by `BrandSprite`. It is split at the word space so the halves can move. `splash` plays the small header reveal for the page's discipline:
  - `motion` (Pen Tool): stroke draws every shape, then the ink fills.
  - `web` (Decode): the name resolves letter by letter out of code characters.
  - `ux` (Responsive): two lines inside a breakpoint frame, then it reflows to one.
- The header picks the splash from the route (`disciplineForPath`); the end card always draws with the pen when it scrolls into view.
- `HeroLockup` is the full-size lockup on the home page. On the first visit of a session (`html[data-intro]`) or any return to home inside the app, the pen draws each shape, drops anchors, fills, then the selection box snaps on. Server markup is always the finished mark.
- `RevealStage` plays the After Effects renders (`public/assets/brand/reveals/*.mp4`) on a black stage in a browser frame, with the final frame as a still for reduced motion, blocked autoplay and after the video ends.

## Information architecture

- Header: wordmark · Work · About · Contact · DOSEN (separate music site) · theme toggle.
- `/web`, `/motion`, `/ux`: one page per discipline, each opening on its reveal, listing its projects (`disciplines` in `src/data/projectIndex.js`) and its own extra (live sites, films, process).
- `/projects` is Work: every project, with discipline filters. Print and book work carries no discipline tag.
- `/stack` (Tools) is linked from About and the footer rather than the header.

## Interaction vocabulary

- Selection handles (blue outline, square handles) snap onto project cards on hover, sit on the About portrait, and frame the hero lockup with its live size.
- Arrow links swap their arrow; card arrows rotate into a filled blue circle.
- Backdrop tools drift slowly, parallax at 0.22× scroll, and lean away from the cursor with a hint of blue. Discipline pages lean on their own tools.
- Everything respects `prefers-reduced-motion`: reveals show their final frame, splashes are off, the backdrop is still.
