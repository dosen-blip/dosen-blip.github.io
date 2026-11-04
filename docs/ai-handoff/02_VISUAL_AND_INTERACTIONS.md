# Layout and behaviour

The look, tokens and design decisions are in `docs/brand-system.md`. This file covers how things are built.

## Breakpoints

| Width | What changes |
|---|---|
| `< 810px` | The main one. Header becomes logo and menu button, `--header-h` drops to 60px, the mobile menu opens as a full panel, the home hero's top row and lede hide, and Instinct shows its still instead of the live scene. |
| `< 1000px` | About's card rows, the Experience list and the project detail layout go to one column. The detail rail goes back to normal flow. |
| `< 1100px` | Film grid and UX steps drop to two columns. |

Shared layout: `.page` is capped at `--page-max` (1320px) with `--gutter` sides, and `.section` uses `--section` spacing. Sizes step down fluidly with `clamp()`.

## Shell

- **Header:** wordmark, Work, About, Contact, DOSEN button, theme toggle. Work also lights up on `/web`, `/motion` and `/ux`, and About on `/stack`. The wordmark plays a small splash for the page's discipline (`disciplineForPath`).
- **Mobile menu:** locks scroll, closes on Escape and after navigating, returns focus. It holds the nav, discipline pills, DOSEN, the toggle and socials.
- **End card:** the black footer on every page. The name draws with the pen when it scrolls into view. It also holds the availability line, email, link columns and Back to top.
- **Backdrop:** `BrandBackdrop` draws the dot grid and floating tools behind every page. `NeonCursor` follows the pointer.

## Scroll and entrances

- Lenis smooth scroll (`lerp: 0.1`), not mounted under reduced motion. Scroll restoration is manual and the swap resets scroll.
- `Reveal`: sections below the fold rise 28px and fade in once. Server markup is always visible, and anything already on screen at hydration is left alone.
- Home intro: `HeroLockup` under `html[data-intro]`, with the hero's other content fading in once the pen finishes.

## Page transitions

`App.jsx` swaps the page under cover, and `SiteShell` gets the displayed pathname so the header, backdrop and end card change with it. `document.title` is set from `metaFor` at the swap.

A capture-phase click listener (`src/transitions/origin.js`) notes where each click happened and picks one of two cuts:

- **Selection box** (`frame.js`, 0.7s hide, 1s show): clicks on `.project-card` or `.gf-sheet`. The blue frame, filled with the card's picture, grows to the screen edges, then shrinks onto the new page's first target in `frame.js` `TARGETS` that is on screen. It re-measures each frame so it follows the rising title.
- **Dot wave** (`dots.js`): everything else, including the back button. A 15px grid with every second dot on the backdrop's 30px grid and its 0.22 parallax. Black dots swell on the leading edge, and `destination-out` holes open onto the live new page on the trailing edge.
  - With the View Transitions API (`snapshot.js`), it is one wave of about 0.72s (`drawWave`, `WAVE`). The old page is the browser's frozen picture, and the new one is clipped to one circle scrubbed from the store's clock, staying inside the solid middle of the band. `BAND_GLOW` lights the band's black, painted `source-atop` so it stays on the black. The overlay and neon cursor have their own `view-transition-name`s so they stay live on top.
  - Elsewhere it covers the screen first (`drawDots`, `PULSE`, about 0.48s then 0.56s).

The store's `uncover` event and `covering` flag gate entrances: `afterUncover` in `arrival.js` starts `Reveal` and `HeroLockup` when the cut has opened over them, and `SiteShell` keys the header splash on `useUncovered()`. Reduced motion and same-page navigation swap immediately.

`prefetch.js` warms a route's top images on link hover, focus or press (`mediaFor`). No route lists a video for now. `warmVideo` stays for when the reveal stage returns.

## Glass

- **`GlassCard`:** `<GlassCard as={Link} to="/x" look="web" className="...">`. The layers sit at `z-index: -1` inside an isolated stacking context, so children need no wrapper. Rules for using it:
  - It has no padding: keep at least 22px, which the contrast figures assume.
  - Consumer classes must not set `background` or `border`, and should not override `position` or `overflow`.
  - For a sticky card, wrap it (see `.detail-rail`).
  - Link cards lift and glow on their own, so don't add your own hover transform.
  - Cards with the same look show identical art, so mix looks along a row.
  - `.stack-card--no-frost` turns off the backdrop blur for pages with many cards.
- **Tokens:** the card sets `--ink`, `--body`, `--soft`, `--accent-strong` and `--on-accent` locally, so child styles work on any look. Don't hardcode text colours inside one.
- **Art:** painted once per recipe at a fixed 480x320 and cached, through one shared queue that spends a few milliseconds a frame. Folders paint before cards. The cursor writes `--gf-px` and `--gf-py`.
- **`GlassFolder`:** rest, hover (the panel leans and files lift) and open (files fan out, each a link). Click or Enter opens; Escape or a press outside closes. The key is one arrow link to the discipline page (`action="link"`), and Cmd-click opens it in a new tab.

## Instinct Groove page

- The page is only a hero: Back to Work, the green Visit site button (the only link to the site), the wordmark, a short intro, then the wall extended by `.ig-hero-more` holding one line.
- The live scene runs at 810px and wider, with WebGL2, without reduced motion and without Save-Data. Otherwise it shows the baked `hero-room` still with the wordmark lettered in CSS, so phones get black in the extended section.
- The camera pulls back with height (`frameHeight`) so the wall keeps its scale. The canvas is capped at 5.5 megapixels (`MAX_PIXELS` in `hero.js`) to hold the frame rate.
- After changing the scene, re-bake the plates: with `npm run dev` running, run `npm run bake:instinct` and open each URL it prints in the browser pane.

## Other components

- `ArrowLink`: internal or external, with an underline and two arrows that swap on hover.
- `ButtonLink`: filled blue for the one main action on a screen, outlined for the rest.
- `ProjectCard`: 16:10 media, image scales to 1.025 on hover, selection handles snap on, arrow turns into a filled blue circle.
- YouTube blocks: poster first, then a `youtube-nocookie.com` iframe on click, with no autoplay.
- `RevealStage`: not rendered on any page for now. Its CSS (`.stage*` in `components.css`), the videos and the `video` and `reveal` fields in `disciplines.js` stay so it can come back.
