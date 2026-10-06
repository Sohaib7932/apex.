# Milestone log

What changed in each milestone, and every deliberate change from the reference designs in `design/` with the reason.

## Milestone 1: Scaffold (2026-10-06)

**Structure**
- Moved the Next.js app into `frontend/`. Added a FastAPI app in `backend/`.
- The repo root keeps only the Neon CLI tooling (`neon.ts`, `.neon`, root `package.json`).
- `.env` files are gitignored. `backend/.env.example` and `frontend/.env.example` are committed with empty placeholders.

**Backend**
- `GET /health` (and `/api/v1/health`) runs `SELECT 1` against Neon. It returns 200 when the database answers and 503 with no error details when it doesn't. Covered by tests.
- SQLAlchemy 2 + psycopg 3 on Neon's pooled URL, with pre-ping for scale-to-zero and no server-side prepared statements (PgBouncer).
- Alembic is set up and uses the direct (unpooled) URL. There are no migrations yet; the schema arrives in M2.
- JSON logs. Secrets are `SecretStr`, and logged exceptions record only the error type.
- OpenAPI docs at `/api/v1/docs`.

**Frontend**
- Design tokens in Tailwind v4 `@theme` (`src/app/globals.css`), sampled from the screenshots in `design/`.
- Font: Plus Jakarta Sans (closest match to the designs).
- Header, SearchBar (works without JS), SubNav with a department drawer, Footer, ModeSwitch.
- `/api/*` is proxied to FastAPI through Next.js rewrites, so the browser sees one origin.
- The home page is a placeholder with a live API and database status card.
- Placeholder `/info/[slug]` pages for footer links, plus a 404 page and an error boundary.
- `/styleguide` (not linked from the UI) shows every token and both switch states.

**Design changes, with reasons**
| Change | Why |
|---|---|
| Sub-nav links `#44464A` → `#C9CED6` on `#161C24`; the active tab gets an orange underline instead of a white box | The original contrast was about 1.5:1 and hard to read. *(approved)* |
| Minimum text size 12px (`text-2xs`); secondary text `#8F9299` → `#4D5566` | The designs had about 10px text, and the grey failed WCAG AA. *(approved)* |
| Dark text on orange buttons instead of white | White on `#FE932C` is about 2.2:1; dark ink is about 8:1. **Not in the approved list; easy to revert (one token: `--color-on-primary`).** |
| "Back to top" text brightened | It was almost invisible in the design. |
| One logo instead of the design's two side-by-side marks | The header was carrying the brand twice. |
| Mobile: search drops to its own full-width row; sub-nav scrolls sideways; "All" opens a drawer | PRD 4.1: search stays visible and the nav becomes a drawer. |

**Pending**
- Seller green and the switch's cream track are **placeholders** until `design/seller-toggle.png` is provided. They are five tokens in `globals.css` (`--color-seller*`, `--color-switch-track`).
- The ModeSwitch is built but hidden, because it is signed-in only and auth arrives in M5. See `/styleguide`.

## Milestone 2: Database, seed data and Home (2026-10-07)

**Backend**
- Full schema in one Alembic migration (`pg_trgm` + trigram index on titles, GIN on facets, the PRD indexes).
  Includes sellers, product `status` and `seller_id`, and order-item seller and fulfillment fields from the start.
- The cart and order lines carry both `variant_id` (color) and `edition_id` (edition), because the product
  page lets you pick one of each. The PRD's single `variant_id` couldn't represent that.
- `seed.py`: 3 stores, 54 published products and 4 drafts, 165 reviews, 5 deals, 4 promo codes (APEX10, WELCOME15
  and SAVE20 are valid; SUMMER5 is expired), and 47 orders over 30 days. It refuses to run on seeded data
  unless you pass `--reset`.
- Public API: `/home`, `/products` (search, filters, sort, pages), `/search/filters`, `/products/{slug}`,
  `/related`, `/reviews`, `/categories`, `/brands`.
- Deals restart every 12 hours, so countdowns on the live demo never stay at zero.
- Product photos are free-licence Unsplash images, stored in `frontend/public/products`
  (`SOURCES.json` lists the originals). The gallery's extra shots are close-up crops of the main photo.

**Frontend**
- The browser calls only `/api/*` on its own origin; Next.js proxies to `API_URL`. Server components call
  `API_URL` directly and never throw: a failed call renders an error state with a retry button.
- The root layout reads the session cookie, so every page renders at request time and `next build`
  never needs the API.
- Home page: delivery bar, hero with spotlight product, department tiles, the 4-card deals grid (with a live
  deal-of-the-day countdown), the trending carousel, flash deals, the featured brand and trust badges.
  Everything comes from `/home`.

**Design changes, with reasons**
| Change | Why |
|---|---|
| "Keep shopping for" uses products recently viewed in this browser, or "Popular right now" | No tracking of signed-out visitors, and the card is never empty. |
| Card buttons pinned to the bottom of each card | Add to Cart lines up across a row. *(approved)* |
| Department tiles 48px icon, 12-14px labels; section spacing 40px | The design's ~10px labels were hard to read. *(approved)* |
| Carousel arrows 44px, plus native swipe with snap points | Easy to use with touch, mouse and keyboard. |
| One featured brand chosen from the data (the third-party brand with the most products) | The section reflects real data, not hard-coded copy. |

**Seller colors:** `design/seller-toggle.png` was never added to the repo, so the seller tokens still use
the PRD's muted forest green `#2F6B4F`. Swap the five `--color-seller*` / `--color-switch-track` values
in `frontend/src/app/globals.css` once the screenshot is available.
