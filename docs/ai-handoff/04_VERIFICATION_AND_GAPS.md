# Checking work and known gaps

## Last verified

2026-11-04, commit `25e6dd3`:

- `npm run lint`: pass.
- `npx vitest run --dir tests`: 25 files, 174 tests, all pass.
- `npm run build`: pass, including the prerender.
- GitHub deploy: success. Changed pages checked on the live site in the browser pane.
- `npm run crawl`: not run, because it launches headless Chrome.

A worktree under `.claude/worktrees/` makes a plain `npm test` pick up its copy too and double the counts. Use `--dir tests` while one exists.

## How much to check

- **Copy or data:** the matching test, then the full suite.
- **Shared CSS or a component:** lint, full tests, build, then look at it in the browser pane at desktop and 375px, in both themes. Tests run in jsdom and can't see layout, canvas or `backdrop-filter`.
- **Motion or performance:** the pane must be visible. A hidden pane stops `requestAnimationFrame`, so numbers from it are meaningless. Dev builds run slower than production.
- **Publishing:** see `00_READ_ME_FIRST.md`, then check the changed pages live.
- **Contact form:** mock `fetch`. Don't send real submissions.

## Tests

| Test | Protects |
|---|---|
| `routes`, `app-routes` | Route list, every route renders, unknown routes give the 404 |
| `project-records`, `projects-index` | Records complete, assets exist, related links valid, SEO, display order |
| `animatic-record`, `seven-due-dates-record` | Those two records' copy and videos |
| `brand` | Discipline routing, header splash, end card, home order, server markup, discipline pages: glass hero, real-text title, outlines for every letter, and that the reveal stage and aside stay gone |
| `shell` | Menu behaviour, DOSEN button, no pill in the footer |
| `about` | About intro, Contact button, card links and looks |
| `contact` | Fields, validation, POST contract, success and failure, glass panels |
| `stack` | Grouped cards, destinations, looks |
| `glass-card` | `GlassCard` layers and server render, `GlassFolder` link key and closing behaviour |
| `frequency-shift`, `instinct` | The two custom project pages |
| `project-detail-interactions`, `slide-deck`, `not-found` | YouTube activation, the detail rail, decks, the 404 page |
| `page-transitions`, `transition-store`, `dots`, `frame`, `origin`, `arrival`, `snapshot`, `prefetch` | Page transitions, tab title at the swap, prefetching |

## Known gaps

- **Discipline titles:** the animation itself isn't covered by tests, because jsdom can't measure text. Check it in the browser pane after changing the title, its font or `.page-title`.
- **Phones on Instinct:** the extended section is one line on plain black, because phones get the still rather than the scene.
- **Instinct join:** the wall ends at a visible edge where the site's lighter background and dot grid begin.
- **Glass:** not checked in Safari or Firefox, or on a real phone. The focus ring on glass is low contrast in places, though the card's rim and glow also light on focus.
- **Mobile menu:** its discipline pills are the one `--surface` card not on glass.
- **Open folders:** have two links to the same page, the crown and the key.
- **About:** the line under "What I do" repeats its cards, and some of the intro repeats Experience.
- **Unused:** `craft` in `disciplines.js` is read nowhere. `warmVideo` and `videos` in `prefetch.js` wait for `RevealStage`.
- **Old tooling:** `npm run visual:test` compares against the July capture of the old site, so its results no longer mean anything. `capture` and `capture:interactions` also target the old site.
- **Build warning:** chunks over 500 kB, mainly the Three.js scene.
