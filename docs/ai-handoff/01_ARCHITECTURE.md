# Architecture and ownership map

## Runtime flow

```text
src/entry-client.jsx
  -> BrowserRouter
  -> App.jsx
  -> SiteShell.jsx
  -> static page OR ProjectDetail(project record)

src/entry-server.jsx
  -> StaticRouter
  -> renderToString(App)
  -> route-specific SEO head
  -> scripts/prerender.mjs
  -> dist/<route>/index.html and dist/404.html
```

`scripts/serve-dist.mjs` serves generated files and returns `dist/404.html` with an actual 404 for unknown paths.

## High-value files

| Concern | Source |
|---|---|
| Route allowlist and navigation | `src/data/routes.js` |
| Router and Lenis enablement | `src/App.jsx` |
| Shared desktop/tablet/mobile shell | `src/components/SiteShell.jsx` |
| Global tokens, shell, shared detail styles | `src/styles/global.css` |
| Static pages | `src/pages/*.jsx` and matching `src/styles/*.css` |
| Project index cards | `src/data/projectIndex.js` |
| Full project records | `src/data/projectRecords/*.js` |
| Project record aggregation | `src/data/projects.js` |
| Reusable project renderer | `src/components/ProjectDetail.jsx` |
| Card behavior | `src/components/ProjectCard.jsx` |
| CTA arrow behavior | `src/components/ArrowLink.jsx` |
| Scroll entrance behavior | `src/components/Reveal.jsx` |
| SEO generation | `src/entry-server.jsx`, `src/utils/seo.js` |
| Contact submission contract | `src/pages/ContactPage.jsx` |
| Build/prerender | `scripts/prerender.mjs` |
| Static production server | `scripts/serve-dist.mjs` |
| Functional crawl | `scripts/crawl-dist.mjs` |
| Visual comparison | `scripts/visual-regression.mjs` |

## Shared design tokens

Defined in `src/styles/global.css`:

| Token | Value |
|---|---|
| ink | `#1a1a1a` |
| muted | `#666` |
| soft | `#999` |
| line | `#e6e6e6` |
| wash | `#fafafa` |
| white | `#fff` |
| green | `#19b373` |
| green wash | `#e9fcf4` |

Inter Regular and Medium are vendored as WOFF2 files.

## Project record contract

Every record exports an object with:

```js
{
  slug, title, category, client, duration,
  date?, cover, gallery,
  blocks: [
    { type: "richText", html },
    { type: "image", src, alt?, caption? },
    { type: "youtube", id, title },
    { type: "link", href, label },
  ],
  liveUrl?, relatedSlugs,
  seo: { title, description, image? }
}
```

`ProjectDetail.jsx` is the only renderer for these records. Related slugs resolve through `getProject`; invalid slugs are filtered, while tests require all configured slugs to be valid.

## Environment contracts

- `VITE_SITE_URL`: defaults to `https://matiadosen.com`; controls canonical and Open Graph URLs.
- `VITE_CONTACT_ENDPOINT`: optional replacement POST destination. Without it, the form defaults to FormSubmit's AJAX endpoint for `matiadosen@outlook.com`.

The contact form sends `Name`, `Email`, and `Message` plus FormSubmit reply-to, subject, template, and honeypot metadata. The first live submission to FormSubmit requires one-time activation from the recipient inbox. Success and failure copy is fixed in `ContactPage.jsx`.

## Build behavior

`npm run build` performs:

1. Client Vite build into `dist/`.
2. SSR bundle into `.prerender/`.
3. Route iteration over `knownRoutes` plus a synthetic not-found render.
4. Per-route HTML output and `dist/404.html`.

Known routes receive prerendered initial markup and route-specific metadata. Browser hydration then enables menus, form state, hover behavior, YouTube activation, Motion, and Lenis.
