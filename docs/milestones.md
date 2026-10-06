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

## Milestone 6: Cart (2026-10-07)

- `/cart`: free-delivery progress ($35 threshold), line items with stock status, delivery date, store and
  options, quantity stepper, Delete, Save for later, and select/deselect (only selected items are totalled
  and checked out).
- Saved for Later with Move to Cart, Delete and "Move all to cart".
- Order summary from the server: items subtotal, promo discount, delivery (FREE or $5.99), 8% tax and
  order total. Promo codes (APEX10, WELCOME15, SAVE20) are checked by the API; invalid or expired codes
  show a clear message.
- "Customers who bought items in your cart also bought" (same departments, excluding what's in the cart).
- Quantity and save-for-later changes are optimistic, with rollback and an error toast if the server
  refuses (e.g. "Only 3 left in stock.").
- Guest cart: stored in localStorage and priced by `POST /cart/price`. On sign-in it merges into the
  account cart (no duplicates, higher quantity wins) and the local copy is cleared. A late guest request
  can no longer write the old cart back after sign-in.
- Checkout is blocked, with the reason shown, when nothing is selected or a selected line has too
  little stock.
- Returning from a cancelled Stripe checkout shows "Checkout was cancelled. You weren't charged."
- Tested in a browser: edition price, protection plan line, quantity, save/move, bad and good promo codes.
  Totals matched `subtotal - 10% + 8% tax` to the cent, and the merge on sign-in worked.

**Design changes, with reasons**
| Change | Why |
|---|---|
| Quantity, Delete and Save for later are 44px controls; at quantity 1 the minus becomes a trash icon | The design's tiny text links were hard to tap. *(approved)* |
| Sticky bottom bar with total and Checkout on phones | The summary is otherwise far below the items. *(approved)* |
| Buying/Selling switch segments are 36px tall | Easier to tap than the slim pill. |
| Removed Instant Pay, PayPal, Apple Pay and financing buttons | Only Stripe Checkout exists; fake payment buttons would be dead controls. |

## Milestone 7: Checkout, Stripe, webhook and orders (2026-10-07)

- `/checkout` (sign-in required, with return URL): (1) shipping address, pre-filled from the default
  address, validated in the browser and on the API, with "Save as my default address"; (2) review items
  and pick Standard (FREE over $35, otherwise $5.99) or One-Day ($9.99). Totals come from the server for
  the chosen method.
- "Place order and pay" creates a `pending` order with title, price, image, store and address snapshots,
  then a Stripe Checkout Session in test mode. Stripe's total always equals the order total: product lines,
  plus an "Estimated tax" line, minus a one-time coupon for the promo, plus a fixed shipping rate. A guard
  refuses to create a session if they ever differ. Adaptive Pricing is off, so Stripe never charges a
  converted local-currency amount.
- Webhook `POST /api/v1/webhooks/stripe` (signature checked): `checkout.session.completed` marks the
  order paid, reduces stock (product and color), updates deal "claimed" counts and removes the purchased
  lines from the cart. The status change is a single conditional UPDATE, so a repeated event does nothing.
  `checkout.session.expired` cancels the pending order.
- `/checkout/success`: asks the API to confirm the payment with Stripe (the redirect alone is never
  trusted; this uses the same idempotent step as the webhook), polls until paid, then shows the order
  number, items, address, estimated delivery and totals.
- Cancel on Stripe returns to the cart with "Checkout was cancelled. You weren't charged."
- `/orders` and `/orders/[id]`: status ("Preparing", "Partially shipped", "Shipped", "Delivered"),
  each item's "Shipped by <store> on <date>" or "Preparing at <store>", address and payment summary.
- Tested for real against Stripe test mode with card 4242: the app, the Stripe page and the order
  record all showed $366.35. The order became `paid`, the cart emptied and stock went down.
- Backend tests (20, against a throwaway schema): pricing maths, Stripe total = order total, stock
  limits, cart merge rules, guest and signed-in totals match, `mark_paid` runs once, webhook signature
  rejected or accepted, duplicate webhook doesn't double-decrement stock, orders private to their buyer,
  auth messages.

**Design changes, with reasons**
| Change | Why |
|---|---|
| Two clear steps with a numbered header and a sticky summary | Easy to see what's left before paying. |
| Delivery options show the arrival day | People choose by date, not by method name. |
| Test card hint next to the Pay button | Reviewers know which card to use in test mode. |

## Milestone 8: Seller workspace (2026-10-07)

- `/seller/*` shares the Apex header (switch set to **Selling**), with a calmer green layout: a sidebar on
  desktop, a bottom tab bar on phones, and no deal banners or department bar. Every page has loading,
  empty and error states, plus a seller 404.
- **Start selling** (`/seller/start`): store name (3-60 characters, unique, with a clear message if taken)
  and description (up to 280, with a live counter). Afterwards the header switch knows you have a store.
  Signed-out visitors are sent to sign in and back.
- **Overview**: revenue, orders and units for the last 30 days; a low-stock count (links to Products filtered
  to low stock); the all-time earnings balance (display only); a daily revenue chart over 30 days with
  empty days shown as zero; the 5 latest orders; and a "N orders to ship" shortcut.
- **Products**: table on desktop, cards on phones, title search, tabs (All, Published, Draft, Low stock)
  with counts, Edit, Publish/Unpublish, and Delete with a confirmation dialog. A product that appears in
  past orders is archived instead of deleted.
- **Product form** (shared by Add and Edit): title, description, brand (existing or new), category,
  price, list price (must be at least the price), stock, image URLs with live preview, reordering and
  "Main" marking, variants (kind, label, price change, stock) and badges. Checked in the browser and
  again on the API. "Save as draft" or "Publish".
- **Orders**: filters (All, To ship, Shipped, Cancelled). Each row shows only this store's units and
  subtotal and expands to its own lines, the shipping address and "Mark as shipped". The buyer's
  order page updates straight away ("Shipped by <store>", "Partially shipped" until every store ships).
- **Store settings**: name, description and logo URL with preview. "Sold by" lines change straight away.
- **Access rules on the API**, covered by `tests/test_seller_access.py` (8 tests): store A gets 404 for
  store B's products (read, edit, publish, unpublish, delete) and orders (read, ship); shared orders show
  only A's lines; a user without a store gets 403 except when creating one; a `seller_id` sent by the
  client is ignored; only paid orders ship; drafts never appear in public endpoints.
- Browser test: the demo seller shipped Jordan's order and the buyer saw "Shipped by KeyForge Supply"; a new
  product was published and found in search with "Sold by KeyForge Supply"; a brand-new user opened a store
  from the header switch.

**Chart:** a single series, so one color and no legend. Bars are capped at 24px with a 2px gap and a
4px rounded top; only the peak day has a label; hover shows any day; "Show as a table" lists every day.
A slightly more saturated green (`--color-seller-chart`, `#1f7a4f`) is used for bars because the
muted UI green failed the chroma check in the dataviz validator.

**Incident and fix:** the first database-test run truncated the demo data in the dev database. The
table existence check in `create_all` looked through the search path into `public`, so the tests used
the real tables. Fixed in `tests/conftest.py`: tables are created explicitly in the test schema, every
`TRUNCATE` names the test schema, and the run stops if the tables resolve anywhere else. The demo data was
re-seeded, and later test runs leave it untouched (checked: 20 users, 59 products and 47 orders before and after).

**Design changes, with reasons**
| Change | Why |
|---|---|
| Bottom tab bar on phones instead of a sidebar | Four sections reachable with a thumb. |
| Orders expand in place instead of opening a new page | Ship a whole queue without losing your place. |
| Seller green stays `#2F6B4F` (PRD value) | `design/seller-toggle.png` wasn't provided, so the colors couldn't be sampled. |

## Milestone 9: Polish and deploy check (2026-10-07)

- **Responsive sweep:** 27 pages (signed out, buyer, seller, new user) at 390, 820 and 1440px, 81 page loads.
  No sideways scroll and no console errors on any of them. Fixed along the way: a carousel's
  screen-reader text widened the page; the Buying/Selling switch showed twice on phones; the cart
  had no `<h1>` when empty; and the seller Overview and missing-product page titles were wrong.
- **Dead links:** a crawler followed all 122 internal links from the main pages (signed out, buyer
  and seller) in a real browser. None lead to a 404. A known-missing product was included as a
  control and was correctly flagged.
- **Vercel readiness:** no `localhost` URLs in the code (only in the `.env.example` comments). `next build`
  passes with the API unreachable, because every page renders on request. Product photos are local
  files in `public/products`, and the `images.unsplash.com` host is allowed for seller image URLs.
- **Render:** `render.yaml` runs `alembic upgrade head` before starting, with a health check on `/health`.
- **README:** short steps to run locally and deploy to Render then Vercel, which variables go where,
  Stripe webhook setup, demo accounts and promo codes.
- **Final checks:** backend ruff clean and 28/28 tests pass; frontend lint, typecheck and `next build` pass.
- The dev database was re-seeded afterwards, so the demo starts clean.
