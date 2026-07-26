# Visual system and interaction notes

## Breakpoints

| Range | Shell behavior |
|---|---|
| `>= 1200px` | Fixed 320px left sidebar; content/footer have 320px left offset. |
| `810px–1199.98px` | Fixed 180px compact sidebar; navigation and DOSEN become icon-only. |
| `<= 809.98px` | Sidebar hidden; fixed mobile header and expandable white menu panel. |

Reference viewports are exactly `1440x900`, `1024x900`, `810x900`, `809x900`, and `390x844`. The 810/809 pair is intentional breakpoint evidence.

## DOSEN control: recently corrected

Implementation: `DosenButton` in `src/components/SiteShell.jsx`; styles in `src/styles/global.css`.

The control is not a flat logo. It contains:

- A 20px clipping window.
- Published disco-ball SVG in soft gray.
- Published home SVG initially positioned 20px below the window.
- A stationary 114px × 26.8359px DOSEN wordmark asset.
- Hover/focus transition: disco moves to `translateY(-20px)` and home moves to `translateY(0)`.
- External destination `https://dosen.figma.site/` in a new tab.

Measured positions after the fix:

| Variant | Rectangle | Contents |
|---|---|---|
| Desktop | `x=25, y=528, w=269, h=74.828` | 24px padding; disco at `x=49`; wordmark at `x=81`. |
| Tablet | `x=68, y=400.3984, w=44, h=44` | 12px padding; icon only. |
| Mobile menu at 390px | `x=24, y=448, w=342, h=74.828` | Full icon + wordmark immediately after Contact. |

Verified interaction images:

- `references/interactions/dosen-desktop-default.png`
- `references/interactions/dosen-desktop-hover.png`
- `references/interactions/dosen-tablet-default.png`
- `references/interactions/dosen-tablet-hover.png`
- `references/interactions/mobile-menu-open.png`

## Shared interactions

- `Reveal`: starts 48px below rest, fades in with a spring, and runs once. SSR content remains visible before hydration.
- Reduced motion: entrance transforms are removed; Lenis is not mounted; CSS transition/animation durations collapse.
- Smooth scroll: `ReactLenis` with `lerp: 0.1` and smooth wheel when reduced motion is off.
- CTA arrow: two diagonal arrow layers exchange positions within a clipped 14px window.
- Project cards: media padding collapses from 12px to 1px and the image scales to `1.015` on hover.
- YouTube blocks: poster first; click swaps to a `youtube-nocookie.com` iframe without autoplay.
- Detail pages: metadata/media rail is sticky on desktop and becomes normal flow below 1200px.
- Mobile menu: toggles document scroll lock, supports Escape, restores focus, and closes after internal navigation.

## Visual evidence lookup

Route screenshot names use:

- `/` -> `home--<viewport>.png`
- `/projects/trendless` -> `projects__trendless--<viewport>.png`
- `/404-probe` -> `404--<viewport>.png`

Directories:

- production: `references/screenshots/`
- latest local visual run: `references/local/`
- pixel diffs over 1%: `references/diff/`
- captured production DOM: `references/dom/`
- sampled computed styles: `references/styles/`

Inspect one route and viewport at a time. Full-page screenshots are much more useful than loading the captured DOM wholesale.

## Intentional published oddity

The Stack page deliberately preserves the published 390px heading/card clipping defect. Do not “fix” it without user approval.
