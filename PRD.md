# Apex Marketplace: Product Requirements Document

**Version:** 1.1
**Status:** Draft for build
**Timebox:** 24 hours (clock tracked, not enforced)
**Purpose:** A working, deployed rebuild of an Amazon-style marketplace, built for the 8x assignment.

### Changelog
- **1.1:** Seller dashboard moved **into scope** (section 4.10). Added the Buying/Selling switch in the header, a `sellers` table, product ownership and publish status, per-seller fulfillment on order items, `/seller/*` API endpoints, seller seed data, and a Seller workspace milestone. Designs are now a strong starting point, not a pixel spec (section 8). Tailwind v4 tokens live in CSS `@theme`, not a config file.

---

## 1. Overview

Apex is an online marketplace where shoppers browse a catalog, search and filter products, view product details, manage a cart, pay securely, and track their orders. The reference designs (home, search results, product detail, cart) define the look and feel: dark navy header and footer, orange primary actions, a soft light background, white cards, and small colored badges.

### 1.1 Goals
1. Ship the **complete core shopping loop** end to end: browse, search, product, cart, checkout (Stripe), orders.
2. Keep the feel of the reference designs (improving them where it helps) and feel fast and polished on desktop and mobile.
3. Be deployed, public, and usable by a visitor who is not signed in.
4. Keep the codebase easy to navigate: one component per section, clear folders.
5. Give sellers a **working seller workspace**: Overview, Products, Orders and Store settings, built on real data and enforced on the API.

### 1.2 Non-goals (deliberately out of scope)
- Prime or membership logic (the UI shows delivery badges, but there is no subscription)
- Stripe Connect, real payouts, seller verification/KYC, platform fees, refunds issued by sellers
- Multiple staff accounts per store, seller-to-buyer messaging, seller analytics beyond the Overview page
- Recommendation engine (recommendation rows use simple rules, such as same category or bundle)
- Ads, sponsored auctions, internationalization, multiple currencies
- Real fulfillment, shipping carrier integration, returns workflow
- Voice or AI shopping assistants

Cutting these is a product decision, not an omission. It keeps the time for the core flow and its polish.

---

## 2. Users and Primary Scenarios

| User | Description | Key needs |
|---|---|---|
| Guest shopper | Not signed in | Browse, search, view products, build a cart |
| Registered shopper | Has an account | Save cart, check out, view order history |
| Seller | A registered user who has created a store | Manage own products, fulfill own orders, see sales and earnings |
| Admin (minimal) | Project owner | Seed and update catalog via script, not a UI |

Any registered user can become a seller; one user has at most one store. A seller still shops as a normal buyer.

**Primary scenarios**
1. A guest searches "wireless mechanical keyboard", filters by brand and price, and opens a product.
2. The guest adds items to the cart, changes quantities, and saves one item for later.
3. The guest signs up at checkout, and the guest cart merges into their account.
4. The shopper pays with Stripe (test mode) and lands on an order confirmation.
5. The shopper revisits Orders and sees status and items.
6. A signed-in user flips the header switch to **Selling**, creates a store (name and short description), and lands on the seller Overview.
7. The seller adds a product, publishes it, and it appears in search with "Sold by <store name>".
8. A buyer orders it; the seller sees the order, marks it shipped, and the buyer's Orders page shows it as shipped.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS | Server components for catalog pages, client components for interactive parts |
| Backend API | **FastAPI** (recommended) or Flask | See 3.1 |
| Database | PostgreSQL on **Neon** | Pooled connection string for the API |
| ORM / migrations | SQLAlchemy 2.x + Alembic | Typed models, versioned migrations |
| Payments | **Stripe** (test mode) | Checkout Session plus webhook |
| Auth | Email and password, JWT in an httpOnly cookie | Passwords hashed with argon2 or bcrypt |
| Hosting | Frontend on Vercel; API on Render, Railway or Fly | Neon for the DB |
| Images | Static assets or a CDN-hosted set; `next/image` | No hotlinking of Amazon assets |

### 3.1 Flask vs FastAPI decision
**Recommendation: FastAPI.** It has automatic OpenAPI docs (handy for the walkthrough and for the frontend), Pydantic validation, and async support. Flask is fine but needs more manual wiring for validation and docs. The API is specified below in a framework-neutral way, so either works.

### 3.2 Branding
The product is called **Apex**. Use original branding (name, logo, copy). Do not use Amazon's logo or trademarks.

---

## 4. Functional Requirements

Priority key: **P0** = must ship, **P1** = should ship, **P2** = nice to have.

### 4.1 Global layout (P0)
- **Header:** logo, delivery location, department selector plus search bar, language/currency label (static), Returns & Orders, account menu ("Hello, name"), cart with item count badge.
- **Buying/Selling switch** (signed-in users only): a rounded pill with a cream background and two segments. **Buying** is the storefront; **Selling** goes to `/seller`. If the user has no store yet, Selling opens the "Start selling" onboarding instead (section 4.10). Signed-out visitors do not see the switch.
- **Sub-navigation:** All, Today's Deals, Best Sellers, Electronics, Home & Kitchen, Computing, and similar links.
- **Footer:** four link columns and a legal row. Links may point to placeholder pages.
- **Responsive:** header collapses on mobile (search stays visible, nav becomes a drawer).

### 4.2 Home page (P0)
Sections, each its own component:
1. **Hero banner:** headline, subcopy, two CTAs, featured spotlight product with price.
2. **Department chips:** icon links to category search.
3. **Deals grid:** four cards (workspace essentials, "Deal of the Day" with countdown and claimed progress, "Keep shopping for" recent items, smart home).
4. **Trending carousel:** product cards with badges, rating, delivery info, Add to Cart.
5. **Flash deals:** discounted products with percent badge, claimed progress, countdown.
6. **Featured brand strip.**
7. **Trust badges:** authentic items, free returns, 24/7 support.

Acceptance: all sections render from database data, not hardcoded values. The carousel scrolls with arrows and touch.

### 4.3 Search results (P0)
- Query via the header search bar; matches title, brand, and category (Postgres full-text or `ILIKE` with trigram index).
- **Filter sidebar:** delivery, customer reviews (4 stars and up, and so on), brand (with counts and a brand search box), price ranges plus custom min/max, and category-specific facets (for keyboards: switch type, connectivity, form factor).
- **Active filter chips** with remove and "Clear all filters."
- **Sort:** Featured, Price low to high, Price high to low, Avg. rating, Newest.
- **Result count** ("1-16 of over 2,000 results for ...").
- **Grid/list toggle** (P1).
- **Product card:** badge(s), wishlist heart (P1), brand, title (truncated to 2 lines), rating and review count, price with strikethrough list price, delivery estimate, Add to Cart.
- **Pagination:** page numbers and a "per page" selector.
- URL reflects state (query, filters, sort, page) so results are shareable and the back button works.

### 4.4 Product detail (P0)
- **Breadcrumbs.**
- **Image gallery:** thumbnails, large image, hover zoom (P1).
- **Info column:** title, brand link, short description, rating plus ratings count, "bought in past month," discount percentage, price, typical list price, color swatches, edition/configuration selector (changes price), key innovations, technical specs table.
- **Seller line:** "Visit the <store name> Store" under the title and **Sold by <store name>** in the buy box, both from the product's real seller.
- **Buy box:** price, delivery estimate and cutoff countdown, stock status ("Only 9 left"), quantity selector, **Add to Cart**, **Buy Now**, sold-by and ships-from info, optional protection plan checkbox (adds to price), gift receipt checkbox, Add to Wishlist (P1).
- **Frequently bought together:** three products with a combined bundle price and "Add all three to Cart."
- **Reviews:** average rating, star breakdown bars, review search (P2), review list with verified purchase badge, helpful counts, "Write a customer review" (P1, signed-in only).

### 4.5 Cart (P0)
- Line items with image, title, stock label, delivery note, variant details, price.
- Quantity stepper, Delete, Save for later, select/deselect items.
- **Saved for later** section with Move to Cart and Delete.
- **Order summary:** items subtotal (selected only), estimated delivery, estimated tax (**8% flat**), order total, Proceed to Checkout (n items).
- **Free delivery progress bar** with a threshold (for example, free over $35).
- **Promo code** input (a handful of seeded codes, for example `APEX10` = 10% off).
- **"Customers also bought"** row based on the cart items' categories.
- **Guest cart:** stored in localStorage and merged into the account cart on login or signup (higher quantity wins, no duplicates).

### 4.6 Checkout and payments (P0)
1. Require login (redirect with a return URL; the guest cart is merged afterward).
2. **Address step:** name, line 1/2, city, state, ZIP, phone. Save as the default address (P1).
3. **Review step:** items, delivery method (Standard or One-Day as a flat fee), totals.
4. **Payment:** redirect to **Stripe Checkout** (test mode) created by the backend with the line items and totals.
5. **Webhook** (`checkout.session.completed`) marks the order **paid** and decrements stock. The webhook is the source of truth, not the redirect.
6. **Confirmation page** shows the order number, items, shipping address, and an estimated delivery date.
7. Failure/cancel returns the user to the cart with a clear message; the order stays `pending` or is expired.

Prices are always recomputed on the server from the database. The client never sends a price.

### 4.7 Accounts and orders (P0)
- Sign up, log in, log out, "Hello, name" in the header.
- **Orders page:** list of orders (date, total, status, item thumbnails) with a detail view.
- Statuses: `pending`, `paid`, `shipped`, `delivered` (simulated), `cancelled`.
- Shipping is per seller: each order item has a fulfillment status set by its seller. The order detail shows each item's status ("Shipped by <store>" or "Preparing"). The order becomes `shipped` when every item is shipped; until then a partly shipped order shows "Partially shipped".
- **Account page** (P1): profile, addresses.

### 4.8 Wishlist (P1)
Heart on cards and product page, wishlist page listing saved items.

### 4.9 Reviews submission (P1)
Signed-in users who have a paid order for the product can post a rating and text.

### 4.10 Seller workspace (P0)

A separate workspace under `/seller` that still feels like Apex: the same header (with the switch set to **Selling**), but a calmer look built around **green** (`--seller-primary`, a muted forest green) instead of orange. There are no deal banners or sub-navigation. A left sidebar on desktop becomes a bottom tab bar on mobile. Four pages, each with loading, empty and error states.

**Onboarding ("Start selling")**
- Shown when a signed-in user without a store picks Selling, or opens any `/seller` route.
- Fields: store name (required, 3-60 characters, unique) and a short description (required, up to 280 characters). On submit the store is created and the user lands on Overview.
- Signed-out users who open `/seller` are sent to login with a return URL.

**Overview**
- Stat cards: **Revenue** (last 30 days), **Orders** (last 30 days), **Units sold** (last 30 days), **Low stock** (published products with stock ≤ 5, linking to Products filtered to low stock).
- **Earnings balance:** total of this seller's items on paid, shipped or delivered orders, all time. It is a display figure only; there are no payouts.
- **Sales chart:** daily revenue for the last 30 days (zero-filled days), a simple bar or area chart.
- **Recent orders:** the latest 5 orders containing this seller's items, linking to Orders.

**Products**
- Table: image, title, price, stock (low stock highlighted), status (Published / Draft), last updated. Search by title, filter by status (All, Published, Draft, Low stock). On mobile the rows become cards.
- **Add / Edit form** (one shared form, own route): title, description, brand (pick existing or type a new one), category (select), price, list price (optional, must be ≥ price), stock, images (URLs with live preview, reorderable, first image is the main one), variants (rows of kind color/edition, label, price delta, stock), badges (pick from a fixed set, such as Best Seller, Apex Choice, Limited Deal). Validated on the client and again on the API.
- **Publish / Unpublish** toggles visibility in the storefront. Drafts are never returned by public catalog endpoints.
- **Delete** asks for confirmation. A product that appears in past orders is archived (hidden everywhere, order history kept); one that does not is deleted.

**Orders**
- List of orders containing at least one of this seller's items, showing only this seller's lines and their subtotal (never other sellers' items). Columns: order number, date, buyer first name, items, subtotal, fulfillment status.
- Status filters: All, To ship (paid, not shipped), Shipped, Cancelled.
- **Mark as shipped** sets this seller's items in that order to shipped (with a timestamp). This updates the buyer's order view (section 4.7). Only paid orders can be shipped.

**Store settings**
- Store name, description and logo (image URL with preview). Same validation as onboarding. Changes show up right away in "Sold by" lines.

**Access rules (enforced on the API, not just the UI)**
- Every `/seller/*` endpoint resolves the store from the logged-in user. The client never sends a seller id.
- Products and orders are always filtered by that store. Asking for another store's product or order returns **404** (not 403), so ids don't leak.
- Creating or editing a product sets `seller_id` on the server. Prices remain server-side for checkout as before.
- API tests cover: seller A cannot read, edit, publish, delete or ship seller B's resources, and a user without a store gets 403 on `/seller/*` (except store creation).

---

## 5. Data Model (PostgreSQL)

```
users            id, email (unique), password_hash, name, created_at
sellers          id, user_id → users (unique), store_name (unique), slug (unique),
                 description, logo_url, created_at, updated_at
addresses        id, user_id → users, full_name, line1, line2, city, state,
                 zip, phone, is_default
categories       id, slug (unique), name, parent_id → categories
brands           id, slug (unique), name
products         id, slug (unique), seller_id → sellers, title, description,
                 brand_id, category_id, price_cents, list_price_cents,
                 rating_avg, rating_count, bought_past_month, stock,
                 badges (text[]), specs (jsonb), facets (jsonb), delivery_speed,
                 is_featured, status (draft|published|archived),
                 created_at, updated_at
product_images   id, product_id, url, position
product_variants id, product_id, kind (color|edition), label, price_delta_cents,
                 image_url, stock
reviews          id, product_id, user_id, rating (1-5), title, body,
                 verified_purchase, helpful_count, created_at
cart_items       id, user_id, product_id, variant_id, quantity,
                 saved_for_later (bool), created_at   (unique user+product+variant)
wishlist_items   id, user_id, product_id, created_at
deals            id, product_id, discount_pct, ends_at, total_qty, claimed_qty
promo_codes      code (pk), percent_off, active, expires_at
orders           id, user_id, status, subtotal_cents, tax_cents, shipping_cents,
                 discount_cents, total_cents, address_snapshot (jsonb),
                 stripe_session_id (unique), stripe_payment_intent_id,
                 created_at, paid_at
order_items      id, order_id, product_id, variant_id, seller_id → sellers,
                 title_snapshot, image_snapshot, seller_name_snapshot,
                 unit_price_cents, quantity,
                 fulfillment_status (unfulfilled|shipped), shipped_at
```

**Indexes:** `products(slug)`, `products(category_id, price_cents)`, `products(seller_id, status)`, trigram/GIN index on `title`, GIN on `facets`, `cart_items(user_id)`, `orders(user_id, created_at desc)`, `order_items(seller_id, order_id)`.

**Rules:** money in integer cents; orders snapshot titles, prices and address so later catalog edits don't change history. `order_items.seller_id` is copied from the product when the order is created, so seller revenue and order lists come straight from order items. Public catalog queries only return `status = published`.

---

## 6. API Specification

Base path `/api/v1`. JSON in and out. Cookie-based auth.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/signup` | Create account | No |
| POST | `/auth/login` | Log in (sets cookie) | No |
| POST | `/auth/logout` | Clear cookie | Yes |
| GET | `/auth/me` | Current user | Yes |
| GET | `/products` | List/search with `q`, `category`, `brand[]`, `min_price`, `max_price`, `min_rating`, `facets`, `sort`, `page`, `per_page` | No |
| GET | `/products/{slug}` | Product detail (images, variants, specs) | No |
| GET | `/products/{slug}/reviews` | Reviews with breakdown | No |
| POST | `/products/{slug}/reviews` | Add review | Yes |
| GET | `/products/{slug}/related` | Bundle and "also bought" items | No |
| GET | `/search/filters` | Facet options and counts for a query | No |
| GET | `/home` | Home sections payload (hero, deals, trending, flash) | No |
| GET | `/cart` | Get cart | Yes |
| POST | `/cart/items` | Add item | Yes |
| PATCH | `/cart/items/{id}` | Quantity / saved-for-later / select | Yes |
| DELETE | `/cart/items/{id}` | Remove item | Yes |
| POST | `/cart/merge` | Merge guest cart after login | Yes |
| POST | `/cart/promo` | Validate promo code | Yes |
| POST | `/checkout/session` | Create order (`pending`) and Stripe Checkout Session | Yes |
| POST | `/webhooks/stripe` | Stripe webhook (signature verified) | Stripe |
| GET | `/orders` | List orders | Yes |
| GET | `/orders/{id}` | Order detail | Yes |
| GET/POST/DELETE | `/wishlist` | Wishlist (P1) | Yes |
| POST | `/seller/store` | Create store (onboarding) | Yes |
| GET | `/seller/store` | Current user's store (404 if none) | Yes |
| PATCH | `/seller/store` | Update name, description, logo | Seller |
| GET | `/seller/overview` | Stat cards, earnings balance, 30-day daily sales, recent orders | Seller |
| GET | `/seller/products` | Own products with `q`, `status` (`published`, `draft`, `low_stock`), `page` | Seller |
| POST | `/seller/products` | Create product (as draft or published) | Seller |
| GET | `/seller/products/{id}` | Own product with images and variants | Seller |
| PUT | `/seller/products/{id}` | Replace product fields, images, variants | Seller |
| POST | `/seller/products/{id}/publish` | Publish | Seller |
| POST | `/seller/products/{id}/unpublish` | Unpublish (back to draft) | Seller |
| DELETE | `/seller/products/{id}` | Delete, or archive if it has orders | Seller |
| GET | `/seller/orders` | Orders with own items, `status` filter, `page` | Seller |
| GET | `/seller/orders/{id}` | One order, own lines only, shipping address | Seller |
| POST | `/seller/orders/{id}/ship` | Mark own items in this order as shipped | Seller |
| GET | `/categories`, `/brands` | Options for the product form | No |

"Seller" means a logged-in user who owns a store. All `/seller/*` lookups are scoped to that store on the server (section 4.10, Access rules). `/auth/me` also returns `seller: {id, store_name} | null` so the header switch knows which way to send the user.

Guest cart: the frontend keeps it locally and calls `/cart/merge` on login. Optionally, the product and cart pricing endpoint accepts a list of items and returns priced lines, so a guest sees correct totals.

---

## 7. Non-Functional Requirements

- **Performance:** product listing and detail pages respond in under 500 ms server time on a warm instance; LCP under 2.5 s on a typical connection. Catalog pages use caching or ISR where the data is public.
- **Security:** hashed passwords, httpOnly + Secure + SameSite cookies, CORS restricted to the frontend origin, Stripe webhook signature verification, server-side price calculation, input validation with Pydantic, rate limiting on auth routes (P1).
- **Reliability:** webhook handler is idempotent (the same event twice does not double-decrement stock).
- **Accessibility:** semantic HTML, alt text, visible focus states, keyboard-operable carousel, filters and quantity controls.
- **Responsive:** designed for 360 px to 1440 px and above.
- **Observability:** structured logs on the API; error boundary pages on the frontend.
- **Secrets:** environment variables only (`DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`); nothing committed.

---

## 8. UX and UI Requirements

- The reference designs are a strong starting point, not a pixel spec. Keep the overall feel (dark navy header, orange buying actions, soft light background, white cards, small badges) and improve spacing, hierarchy, contrast, mobile layout and clunky interactions where it helps. Each change is noted in the milestone summary with the reason.
- Define tokens (colors, radii, spacing, font) once in CSS with Tailwind v4 `@theme`. The seller workspace uses the same tokens, with green as its primary color instead of orange.
- Loading skeletons for lists, cards and the product page.
- Empty states: no search results (with suggestions), empty cart, no orders.
- Error states: failed requests show a retry action, not a blank page.
- Optimistic UI on cart quantity and saved-for-later actions, with rollback on failure.
- Toast confirmation when adding to cart; the header cart count updates immediately.
- Realistic seed content (names, images, reviews) so no page looks empty.

---

## 9. Seed Data

- 40 or more products across **Audio and Headphones, Laptops, Computing (keyboards, mice, monitors, storage), Smart Home, Kitchen, Accessories**.
- At least 6 mechanical keyboards with facets (switch type, connectivity, form factor) so the search design's filters work.
- 5 to 15 reviews on featured products, with a realistic rating spread.
- 4 to 6 active deals with end times and claimed quantities.
- 3 promo codes.
- **Sellers:** three demo stores (for example "Apex Official Store", "Northwind Audio", "KeyForge Supply"), each owning a share of the products, and a few drafts and low-stock items so every seller page has something to show.
- **Demo seller login:** `seller@apex.demo` / a documented demo password, owning one of the stores.
- **Demo buyer login:** `buyer@apex.demo`, plus seeded paid, shipped and delivered orders spread over the last 30 days, so the seller Overview chart, stat cards and Orders page show real numbers.
- A script (`seed.py`) that is safe to re-run.

---

## 10. Milestones (build order)

| # | Milestone | Outcome |
|---|---|---|
| 1 | Scaffold and deploy | Next.js on Vercel, FastAPI on host, Neon connected, `/health` works, design tokens, layout shell (Header, SubNav, Footer) |
| 2 | Data and Home | Full schema (including `sellers`, product ownership and status, order-item seller fields) + migrations, seed script with demo sellers, `/home` endpoint, full Home page |
| 3 | Search | Search, filters, sort, pagination, URL state |
| 4 | Product page | Gallery, variants, buy box with real "Sold by", bundle, reviews |
| 5 | Auth and Cart | Signup/login, server cart, guest cart merge, summary, saved for later, promo, Buying/Selling switch in the header |
| 6 | Checkout and Orders | Address, Stripe Checkout, webhook, confirmation, order history with per-item shipping status |
| 7 | Seller workspace: store and products | Seller layout and green theme, onboarding, Store settings, Products table and add/edit form, publish/unpublish/delete, ownership tests |
| 8 | Seller workspace: orders and overview | Seller Orders with filters and Mark as shipped, Overview stat cards, earnings balance, 30-day chart, recent orders |
| 9 | Polish and ship | Responsive pass, skeleton/empty/error states, accessibility pass, README, final deploy check in incognito |

If time runs short, cut in this order: wishlist, review submission, grid/list toggle, hover zoom, saved addresses, image reordering in the product form. Do not cut anything in milestones 1 to 8.

---

## 11. Success Criteria / Acceptance Checklist

- [ ] A signed-out visitor can open the live link, browse the home page, search, filter, open a product and add to cart.
- [ ] Signing up or logging in keeps the guest cart.
- [ ] A Stripe test payment (`4242 4242 4242 4242`) completes, the order becomes `paid`, and appears in Orders.
- [ ] Totals in cart, Stripe and the order record all match (including 8% tax and promo).
- [ ] Every page has loading, empty and error states and works at 390 px width.
- [ ] A signed-in user can switch to Selling, create a store, add and publish a product, and find it in search with "Sold by <store name>".
- [ ] The demo seller sees non-empty stat cards, chart, products and orders; marking an order shipped changes what the buyer sees.
- [ ] Seller A cannot read or change seller B's products or orders through the API (covered by tests).
- [ ] No console errors on the main flows; the production build and lint pass.
- [ ] Repository is public, README explains setup, and `.agent-logs/` is committed.

---

## 12. Repository Structure

```
apex/
├── frontend/                 # Next.js app
│   └── src/
│       ├── app/              # routes: /, /search, /product/[slug], /cart,
│       │                     #   /checkout, /orders, /login, /signup
│       │   └── seller/       # /seller (overview), /seller/start, /seller/products,
│       │                     #   /seller/products/new, /seller/products/[id],
│       │                     #   /seller/orders, /seller/settings
│       ├── components/
│       │   ├── layout/       # Header, SubNav, Footer, DeliveryBar, ModeSwitch
│       │   ├── seller/       # SellerShell, SellerNav, StartSellingForm, StatCards,
│       │   │                 #   SalesChart, RecentOrders, EarningsCard, ProductsTable,
│       │   │                 #   ProductForm, ImagesField, VariantsField, BadgesField,
│       │   │                 #   OrdersTable, OrderStatusFilter, StoreSettingsForm
│       │   ├── home/         # HeroBanner, DepartmentChips, DealsGrid,
│       │   │                 #   ProductCarousel, FlashDeals, FeaturedBrand, TrustBadges
│       │   ├── search/       # FilterSidebar, ActiveFilters, SortBar,
│       │   │                 #   ProductCard, ResultsGrid, Pagination
│       │   ├── product/      # ImageGallery, ProductInfo, VariantPicker, BuyBox,
│       │   │                 #   FrequentlyBoughtTogether, ReviewSummary, ReviewList
│       │   ├── cart/         # CartItem, OrderSummary, SavedForLater,
│       │   │                 #   CartRecommendations, FreeDeliveryProgress
│       │   └── ui/           # Button, Badge, StarRating, PriceTag, Carousel, Skeleton
│       ├── lib/              # api client, formatters
│       ├── context/          # AuthContext, CartContext
│       └── types/
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── core/             # config, security, db session
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routers/          # auth, products, cart, checkout, orders, webhooks, seller
│   │   └── services/         # pricing, stock, stripe, seller_stats
│   ├── alembic/              # migrations
│   ├── seed.py
│   └── tests/
├── design/                   # reference screenshots
├── .agent-logs/              # committed agent prompts and responses
├── PRD.md
└── README.md
```

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Too much scope for 24 hours | Strict P0/P1/P2 order; cut list in section 10 |
| Two deployments (Vercel and API host) add setup time | Deploy empty versions in milestone 1 and keep them live |
| Neon cold starts slow the first request | Use the pooled connection string; keep queries indexed |
| Stripe webhook can't reach localhost | Use the Stripe CLI locally; configure the production webhook URL after the API deploys |
| Cross-origin cookie issues between Vercel and the API host | Proxy `/api/*` through Next.js rewrites so the browser sees one origin |
| Empty-looking store hurts UX score | Invest early in realistic seed data and images |
| Seller data leaking across stores | Scope every `/seller/*` query by the store from the session; ownership tests in CI |
| Seller dashboard adds scope | Four pages only, split across two milestones; built after the buyer loop works |

---

## 14. Open Questions

1. Flask or FastAPI (recommendation: FastAPI)?
2. API host choice: Render, Railway or Fly?
3. Image source: self-hosted placeholder set or a licensed free image set?
4. Custom domain, or the default `*.vercel.app` link?
5. Product and logo images in the seller form: image URLs with preview (current plan), or real uploads (needs a storage service such as Vercel Blob)?
