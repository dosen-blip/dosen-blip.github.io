# Architecture and where things live

## Runtime

```text
src/entry-client.jsx -> BrowserRouter -> App.jsx -> SiteShell.jsx -> the page on screen

src/entry-server.jsx -> StaticRouter -> renderToString(App) -> metaFor + seoFor
  -> scripts/prerender.mjs -> dist/<route>/index.html and dist/404.html
```

Components must render on the server: no `window` during render. `App.jsx` renders routes against the page on screen rather than the address bar, because a page transition swaps the page after the URL changes.

Dependencies: React, React Router, Lenis, Three.js (pinned to 0.170.0, the Instinct scene only). There is no animation library and no CSS framework.

## Where things live

| Concern | Source |
|---|---|
| Routes and header nav | `src/data/routes.js` |
| Router, swap, scroll reset, tab title, Lenis | `src/App.jsx` |
| Header, mobile menu, footer end card | `src/components/SiteShell.jsx`, `src/styles/shell.css` |
| Tokens and fonts | `src/styles/tokens.css` |
| Base type, `.page`, `.section`, `Reveal` styles | `src/styles/base.css` |
| Buttons, arrow links, project cards, selection handles | `src/styles/components.css` |
| Pages | `src/pages/*.jsx`, with a matching stylesheet in `src/styles/` |
| Disciplines (copy, tools, reveal video) | `src/data/disciplines.js` |
| Site constants, page titles and descriptions | `src/data/site.js` |
| Project cards and discipline tags, in display order | `src/data/projectIndex.js` |
| Project records | `src/data/projectRecords/*.js`, gathered in `src/data/projects.js` |
| Standard project page | `src/components/ProjectDetail.jsx`, `src/styles/detail.css` |
| Frequency Shift page | `src/components/FrequencyShiftDetail.jsx`, `src/styles/frequency-shift.css` |
| Instinct Groove page | `src/components/InstinctDetail.jsx`, `InstinctScene.jsx`, `src/scenes/instinct/`, `src/styles/instinct.css` |
| Instinct cards and folder sheet | `src/components/InstinctCardArt.jsx`, `src/styles/instinct-card.css` |
| Card material | `src/components/GlassCard.jsx`, `src/styles/glass-card.css` |
| Home page folders | `src/components/GlassFolder.jsx`, `src/styles/glass-folder.css` |
| Shared glass parts | `glassArt.jsx` (paint queue, `ArtCanvas`), `glassFolderArt.js` (art generator), `useGlassPointer.js`, `src/data/glassLooks.js` |
| Wordmark and reveals | `src/brand/paths.js`, `Wordmark.jsx`, `HeroLockup.jsx`, `RevealStage.jsx` (not rendered for now) |
| Backdrop and cursor | `BrandBackdrop.jsx`, `NeonCursor.jsx`, `src/brand/ToolIcon.jsx` |
| Page transitions | `src/transitions/`, `src/components/TransitionOverlay.jsx` |
| Titles and SEO head | `src/utils/seo.js` (`metaFor`, `seoFor`) |
| Contact form | `src/pages/ContactPage.jsx` |
| Build and server | `scripts/prerender.mjs`, `scripts/serve-dist.mjs` |

Colours and type are documented in `docs/brand-system.md`, not here.

## Project record contract

```js
{
  slug, title, category, client, duration,
  date?, cover, gallery,
  blocks: [
    { type: "richText", html },
    { type: "image", src, alt?, caption? },
    { type: "youtube", id, title, description? },
    { type: "video", id, title, description?, src, poster },
    { type: "deck", id, title, description?, deck },
    { type: "link", href, label },
  ],
  summary?, liveUrl?, relatedSlugs,
  seo: { title, description, image? }
}
```

A record with `layout: "frequencyShift"` or `layout: "instinct"` holds `content` instead of `blocks` and gets its own component (`ProjectRoute` in `App.jsx`). Everything else goes through `ProjectDetail`.

To add a project, add its slug to `projectSlugs` in `routes.js`, its record to `projects.js` and its card to `projectIndex.js`. Tests check the three agree. The order in `projectIndex.js` is the display order.

## Environment

- `VITE_SITE_URL`: defaults to `https://matiadosen.com`; sets canonical and Open Graph URLs.
- `VITE_CONTACT_ENDPOINT`: optional. Without it, the form posts to FormSubmit's AJAX endpoint for `matiadosen@outlook.com`, sending `Name`, `Email` and `Message` plus reply-to, subject, template and honeypot fields.

## Build

`npm run build` runs the client Vite build into `dist/`, an SSR bundle into `.prerender/`, then `scripts/prerender.mjs`, which writes one HTML file per known route and `dist/404.html`. `dist/` and `.prerender/` are gitignored.
