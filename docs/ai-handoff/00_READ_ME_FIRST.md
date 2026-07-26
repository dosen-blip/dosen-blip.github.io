# AI handoff: read this first

This repository is a standalone React/Vite clone of the **published** `https://matiadosen.com` portfolio. The Framer editor is not authoritative because it contains unpublished work. The frozen production capture at `references/` is the visual and content authority.

## Current scope

- 13 known routes: five static pages and eight project pages.
- One catch-all 404, emitted as `dist/404.html` and returned with HTTP 404 by the local production server.
- Plain JavaScript/JSX, React Router, Vite, CSS, Motion, Lenis, Vitest, and Playwright-based capture scripts.
- 55 localized assets in `public/assets/`; third-party destinations and YouTube media remain external.
- No deployment configuration and no deployment is authorized by the original task.

## Minimal context-loading strategy

Do **not** load the full frozen DOM, all screenshots, all project records, or all CSS at once.

1. Read this file.
2. Read only the handoff file matching the task:
   - architecture/build/routing: `01_ARCHITECTURE.md`
   - layout/responsive/hover/animation: `02_VISUAL_AND_INTERACTIONS.md`
   - copy/projects/links/SEO: `03_CONTENT_AND_ROUTES.md`
   - tests/status/known gaps: `04_VERIFICATION_AND_GAPS.md`
3. Open the exact source file named in that document.
4. For visual work, inspect only the matching `references/screenshots/<route>--<viewport>.png` and local/diff image.
5. Use `references/manifest.json` only for precise copy, metadata, links, or asset URLs. It is large.

## Source-of-truth order

1. Frozen production evidence in `references/` (captured 2026-07-21).
2. Published wording and oddities recorded in project/page source.
3. Current implementation in `src/`.
4. The old implementation plan or Framer editor state.

If production changes after the capture, keep the frozen capture unless the user explicitly asks to refresh the reference.

## Guardrails

- Preserve exact published wording, including typos and unusual titles such as `Project Name - My Framer Site`.
- Do not add draft routes: `/hintonx`, `/page`, `/dj-production`, or `/page-2`.
- Do not run `npm run capture` casually: it overwrites the frozen production reference.
- Do not make real contact submissions unless the user separately supplies an endpoint and authorizes a submission test.
- Keep Framer-hosted static media local. Keep YouTube, social, App Store, Google Play, Figma, and project-site destinations external.
- Accessibility improvements are allowed when they do not alter the reference appearance.
- The working tree was created as a new, currently untracked project; do not assume Git history exists for individual changes.

## Fast commands

```sh
npm run dev
npm run lint
npm test
npm run build
npm run serve
npm run crawl
```

The local production server defaults to `http://127.0.0.1:4173`.

## Ready-made prompt

For a concise prompt to give another model, use `MODEL_STARTER_PROMPT.md`.
