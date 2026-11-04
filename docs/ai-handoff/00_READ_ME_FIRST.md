# Read this first

This is Matia Dosen's portfolio at `https://matiadosen.com`: React, Vite, plain CSS, prerendered to static files and hosted on GitHub Pages.

Last brought up to date on 2026-11-04, at commit `25e6dd3`. If the code and these docs disagree, the code is right: fix the doc.

## Source of truth, in order

1. The code in `src/`, for what the site does.
2. `docs/brand-system.md`, the design system, for how it should look and behave, and which decisions to keep.
3. These handoff files, as a map of the code.
4. The brand source folder, `~/Desktop/Desktop Files/Design & Portfolio/dosen-matia-final-brand/`: PDF, wordmarks, reveal videos, backdrop icons.

Historical, and not authority for anything: `references/` (a July 2026 capture of the old Framer site), `pagespecs/`, `docs/design-review/` (a September review of the old layout) and `docs/matia-portfolio-ai-handoff.zip` (the July handoff).

## Which file to read

- Build, routing, where things live: `01_ARCHITECTURE.md`
- Layout, breakpoints, motion, how a component behaves: `02_VISUAL_AND_INTERACTIONS.md`
- Copy, projects, links, SEO: `03_CONTENT_AND_ROUTES.md`
- Tests, how to check work, known gaps: `04_VERIFICATION_AND_GAPS.md`

Open the source file a doc names rather than reading everything. `frequency-shift.css` alone is over 1,500 lines.

## Rules for working here

- **Pushing `main` deploys the live site.** Commit or push only when Matia asks. There are no pull requests in this repo: work lands on `main`, and a fast-forward push publishes it.
- **Don't launch headless Chrome.** It fills Matia's disk with caches. `npm run crawl`, `npm run capture`, `npm run capture:interactions` and `npm run visual:test` all launch it, so ask first. Check visuals in the browser pane instead.
- **Show the browser pane before judging a page.** A hidden pane stops `requestAnimationFrame`, so the home intro and `Reveal` sections look blank and timing numbers mean nothing.
- **`~/Documents/INSTINCT 2` is read-only.** It is the separate Instinct Groove site. Copy from it, never write to it.
- **Don't send real contact submissions** while testing.
- **Don't run `npm run capture`.** It overwrites the frozen reference.

## Commands

```sh
npm run dev      # the Claude preview config uses port 5199
npm run lint
npm test
npm run build    # client build, SSR bundle, then prerender
npm run serve    # serves dist at http://127.0.0.1:4173, with a real 404
npm run bake:instinct   # re-bakes the Instinct plates (no headless browser)
```

## Publishing

1. Run lint, tests and build.
2. Commit to `main`, leaving out the untracked `.claude/` and `docs/design-review/`.
3. Fetch, confirm `origin/main` hasn't moved, then `git push origin main`.
4. `.github/workflows/deploy-pages.yml` runs lint, tests and build on Node 24, then deploys. Wait for it to succeed.
5. Check the changed pages at `https://matiadosen.com` in the browser pane.
