# Verification status and known gaps

## Current functional status

Verified on 2026-07-27 after the HintonX video-production addition:

- Node.js: v25.9.0.
- `npm run lint`: pass.
- `npm test`: pass, 12 files and 40 tests.
- `npm run build`: pass; client bundle, SSR bundle, prerendered routes, and 404 produced.
- `npm run capture:interactions`: pass; desktop/tablet DOSEN default and hover states are asserted and captured.
- `npm run crawl`: pass; all 14 known routes passed status/metadata/assets/console/internal-link checks and an unknown route returned HTTP 404.
- Local production preview: working at `http://127.0.0.1:4173` during the originating task.

Re-run `npm run crawl` after any routing, asset, SEO, or build change.

## Test ownership

| Test | Protects |
|---|---|
| `routes.test.jsx` | 5 static + 9 project route manifest |
| `app-routes.test.jsx` | all route rendering and unknown-route 404 |
| `project-records.test.js` | record completeness, block types, localized assets, related links, SEO |
| `projects-index.test.jsx` | nine-card display order |
| `animatic-record.test.js` | Animatic metadata/copy/video/order |
| `seven-due-dates-record.test.js` | Seven Due Dates metadata/copy/video/order |
| `project-detail-interactions.test.jsx` | YouTube activation and metadata visibility |
| `contact.test.jsx` | fields, validation, disabled state, POST contract, success/failure |
| `shell.test.jsx` | menu behavior and DOSEN structure/destination |
| `stack.test.jsx` | grouped stack cards and new-tab destinations |
| `not-found.test.jsx` | 404 copy and home link |

## Visual regression truth

The original requirement was no more than 1% pixel difference per route/viewport. The last complete run in `references/visual-results.json` was generated at 18:00 EDT, before the 19:06 DOSEN fix, and **did not meet that target**:

- 70 route/viewport comparisons.
- Only 2 were at or below 1%.
- Mean mismatch ratio: about 10.87%.
- Maximum mismatch ratio: about 45.50%.

The largest average gaps are currently in long project-detail pages, especially Trendless, Beatport, and Novak Books. Do not report the clone as 1:1 pixel-certified.

The DOSEN fix has its own newer focused interaction evidence. A full `npm run visual:test` should be rerun before making any new claim about global visual parity.

## Visual command behavior

`npm run visual:test`:

- serves no site itself; `npm run serve` must already be running.
- captures 15 route states (14 known + 404 probe) at five viewports.
- disables animation/transition noise.
- writes local screenshots, diff images, and `references/visual-results.json`.
- exits nonzero when any comparison exceeds 1%.

Focused runs can reduce cost:

```sh
VISUAL_ROUTES=/contact VISUAL_VIEWPORTS=390x844 npm run visual:test
VISUAL_ROUTES=/projects/trendless VISUAL_VIEWPORTS=1440x900 npm run visual:test
```

## Risk-based verification

- Copy/data-only change: targeted record/page test, then full unit suite.
- Shared shell/CSS change: lint, full tests, build, interaction capture, and at least 1440/1024/390 screenshots.
- Route/SEO/asset change: lint, tests, build, serve, crawl.
- Pixel-parity work: focused visual test during iteration; full 70-comparison run only at the end.
- Contact endpoint work: mock fetch only unless real submission is separately authorized.
