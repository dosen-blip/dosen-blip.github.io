# Matia Dosen Portfolio Clone

Standalone React + Vite implementation of the published `https://matiadosen.com` portfolio. The source of truth is the frozen production capture in `references/`; unpublished Framer editor changes and excluded draft routes are not included.

## AI/model handoff

Start with [`docs/ai-handoff/00_READ_ME_FIRST.md`](docs/ai-handoff/00_READ_ME_FIRST.md). It provides a low-token loading strategy, architecture map, route/content inventory, exact responsive and interaction notes, current verification status, and a ready-to-paste prompt for another model.

## Local development

```sh
npm install
npm run dev
```

## Production output

```sh
npm run lint
npm test
npm run build
npm run serve
```

`npm run build` writes prerendered route indexes and `404.html` to `dist/`. `npm run serve` serves known files from `http://127.0.0.1:4173` and returns the 404 document with an actual HTTP 404 for unknown paths.

## Environment

- `VITE_SITE_URL` defaults to `https://matiadosen.com` and controls canonical/Open Graph URLs.
- Contact submissions default to FormSubmit's AJAX endpoint for `matiadosen@outlook.com`. The form emails `Name`, `Email`, and `Message`, includes reply-to metadata and a honeypot, and requires a one-time inbox activation after the first live submission.
- `VITE_CONTACT_ENDPOINT` can optionally replace the default endpoint with a dedicated form backend later.

## Deployment

Pushes to `main` deploy the production `dist/` build to GitHub Pages through `.github/workflows/deploy-pages.yml`. The workflow runs lint and tests before publishing.

## Verification

- `npm run crawl` checks statuses, metadata, assets, console errors, internal links, and the unknown-route 404 while the production server is running.
- `npm run capture` refreshes the production reference capture.
- `npm run vendor:assets` localizes Framer-hosted media discovered by the capture.
- `npm run visual:test` captures all 70 route/view combinations and writes measurements to `references/visual-results.json` plus local/diff images.
