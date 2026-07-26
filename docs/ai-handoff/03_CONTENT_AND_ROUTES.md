# Content, routes, and external links

## Route inventory

Static routes:

| Route | Module |
|---|---|
| `/` | `src/pages/HomePage.jsx` |
| `/about` | `src/pages/AboutPage.jsx` |
| `/projects` | `src/pages/ProjectsPage.jsx` |
| `/stack` | `src/pages/StackPage.jsx` |
| `/contact` | `src/pages/ContactPage.jsx` |

Project routes:

| Route | Title | Client | Duration | Blocks | Gallery |
|---|---|---|---|---|---:|
| `/projects/trendless` | Trendless | Academic Team Project | 7 Weeks | rich text, image | 3 |
| `/projects/animatic-remastered` | Animatic Remastered | Algonquin College | 1 Week | YouTube, rich text | 0 |
| `/projects/seven-due-dates` | Seven Due Dates | Algonquin College | 1 Week | YouTube, rich text | 0 |
| `/projects/2024-chasing-greatness` | Chasing Greatness - ECommerce Website | Hinton Publishing | 2 Months | external link, rich text | 3 |
| `/projects/novak-books` | Novak Books | Hinton Publishing | 4 Months | rich text, external link, rich text | 4 |
| `/projects/menu-design` | Restaurant Menu Design | Algonquin College | 4 Weeks | rich text | 1 |
| `/projects/beatport-redesign` | Beatport Redesign | Algonquin College | 4 Weeks | rich text | 3 |
| `/projects/toldya-tennis` | ToldYa - Tennis Application | HintonX | 6 Months | rich text with store links | 1 |

Catch-all unknown routes render `NotFoundPage.jsx`; production output also includes `dist/404.html`.

Excluded routes: `/hintonx`, `/page`, `/dj-production`, and `/page-2`.

## Page behavior summary

- Home: hero and availability, three recent project records, six stack teaser cards. CSS hides the third project and later stack cards on small screens.
- About: responsive portrait, Education and Stack sections, and two Experience cards.
- Projects: eight cards in the exact order defined by `projectIndex.js`.
- Stack: eight cards. All currently use the published Framer referral destination.
- Contact: native required/email validation, optional endpoint, honeypot, fixed success/failure/unavailable messages.
- Detail pages: one shared renderer driven by ordered records; metadata, rich content, optional gallery/video/link, related projects, and route SEO.

## Project order

The canonical order is:

1. trendless
2. animatic-remastered
3. seven-due-dates
4. 2024-chasing-greatness
5. novak-books
6. menu-design
7. beatport-redesign
8. toldya-tennis

This order is duplicated intentionally in `projectSlugs`, the project record imports, and `projectIndex`. Tests enforce consistency.

## External-link policy

Preserve published destinations and new-tab behavior:

- DOSEN/Figma site
- Instagram and LinkedIn
- Framer referral links used by stack cards
- 2024 Tennis website
- Novak bookstore
- App Store and Google Play links inside ToldYa copy
- YouTube thumbnail/player endpoints

Static Framer media must remain local under `/assets/`.

## SEO

Project SEO lives inside each project record. Static routes without explicit SEO use defaults in `entry-server.jsx` and `seo.js`. `VITE_SITE_URL` controls canonical and Open Graph URL construction.

For exact published title, description, canonical, or link text, query the single matching route/view in `references/manifest.json`; do not infer or normalize it.
