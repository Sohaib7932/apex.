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

## Milestone 3: Accounts and the Buying/Selling switch (2026-10-07)

- `/login` and `/signup`: inline field errors (shown after submit, linked with `aria-describedby`),
  a clear banner for server errors ("Incorrect email or password.", "An account with this email
  already exists."), show/hide password, and a safe `?next=` return path.
- One-click "Demo buyer" / "Demo seller" buttons fill the form, so reviewers don't have to type passwords.
- Session: argon2 password hashes and a JWT in an httpOnly, SameSite=Lax cookie (Secure in production).
  The cookie is first-party because the browser only talks to the Vercel origin.
- Login rate limit: 10 attempts per 5 minutes per IP and email.
- Header: "Hello, name" account menu (Your Account, Your Orders, Seller workspace / Start selling, Sign out)
  and the Buying/Selling switch for signed-in users only.
- `/account`: profile, saved addresses and quick links.
- When the guest cart exists and you sign in, it is merged into your account cart (higher quantity wins).

**Design changes, with reasons**
| Change | Why |
|---|---|
| 48px inputs with 16px text | Easy to tap, and iOS doesn't zoom into the field. |
| Errors are worded as fixes ("Use at least 8 characters.") | They tell people what to do, not just what went wrong. |

## Milestone 4: Search (2026-10-07)

- `/search` keeps the query, department, brands, price, rating, delivery, stock, keyboard facets, sort,
  page, page size and grid/list view in the URL. Links are shareable and Back works (tested in a browser).
- Sidebar: department, Apex One-Day, in stock, customer reviews, brand (with a search box when there are
  more than 7), price ranges plus custom min/max, and facets from the data
  (switch type, connectivity, form factor, hot-swap, headphone type, resolution...). Counts come from `/search/filters`.
- Active filter chips, each removable, plus "Clear all filters" (keeps the search words and department).
- Result count ("1-16 of 23 results for ..."), sort (Featured, price both ways, rating, newest),
  pagination with page numbers and a per-page selector.
- A "deal spotlight" banner built from the first deal in the results.
- No-results state: tips, popular searches and popular products. Loading skeleton while results load.

**Design changes, with reasons**
| Change | Why |
|---|---|
| Card buttons pinned to the bottom of each card | Add to Cart lines up across a row even when titles wrap. *(approved)* |
| Filters open in a full-height drawer on phones and tablets, with "Show N results" | The sidebar doesn't fit at 390px. *(approved)* |
| Results fade while a new filter loads; checkboxes update instantly | Visible feedback even on a slow connection. |
| 40-44px rows for filter options and page numbers | Easy to tap. |

## Milestone 5: Product page (2026-10-07)

- Breadcrumbs; gallery with thumbnails and hover zoom (P1); "Visit the <store> Store" links to that store's
  listings (`/search?seller=...`, new API filter); rating, "bought in past month" and a price box with
  discount and typical list price.
- Color swatches and edition cards. The edition changes the price and the color sets the stock shown.
- Buy box: delivery date with an order-cutoff countdown, stock status, quantity, Add to Cart, Buy Now
  (adds the item and goes to checkout), ships from / sold by (the real store) / returns / payment, and a
  gift receipt option.
- The 2-Year Protection Plan is a real catalog product ($19.99, "Protection Plans" category), added as its
  own cart line, so its price comes from the server like everything else. It's offered on items over $50.
- Key innovations, technical specs, about the seller.
- Frequently bought together: the item plus two matching add-ons (headphones get a case and a stand),
  each with a checkbox, a total, and "Add all 3 to Cart". No made-up bundle discount, so the cart
  total matches.
- Reviews: average, a breakdown by star (each bar filters the list), review search, sort, "Show more",
  Helpful votes, Verified Purchase labels, and a review form for people who bought the product.
- "Customers also viewed" carousel; viewed products feed "Keep shopping for" on the home page.
- Loading skeleton; unknown products show the 404 page.

**Design changes, with reasons**
| Change | Why |
|---|---|
| On phones the buy box comes right after price and options; specs and innovations follow | The purchase controls are reachable without scrolling past the whole spec sheet. |
| Buy box is sticky on desktop | Add to Cart stays in view while you read specs. |
| Star bars filter the review list | The bars were display-only in the design; now they're useful. |
| "Add to Apex Wishlist" left out | Wishlist is P1 and first on the PRD's cut list. A button that does nothing would be a dead control. |
