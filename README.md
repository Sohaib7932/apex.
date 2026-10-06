# Apex Marketplace

An Amazon-style marketplace built from [PRD.md](PRD.md): browse, search, product pages, cart, Stripe checkout
(test mode), order tracking, and a seller workspace.

```
frontend/   Next.js 16 (App Router, Tailwind v4)       -> Vercel
backend/    FastAPI, SQLAlchemy 2, Alembic, Stripe       -> Render
design/     reference screenshots
docs/       milestones.md: what was built in each step, and every design change with the reason
```

## Demo accounts

Password for all of them: `ApexDemo2026!` (the sign-in page has one-click "Demo buyer" / "Demo seller" buttons).

| Email | What it shows |
|---|---|
| `buyer@apex.demo` | A shopper with past orders, some shipped and some partly shipped |
| `seller@apex.demo` | Owns **KeyForge Supply**: overview chart, products, orders to ship |
| `northwind@apex.demo`, `official@apex.demo` | The other two demo stores |

Promo codes: `APEX10`, `WELCOME15`, `SAVE20` (`SUMMER5` is expired, to show the error).
Stripe test card: `4242 4242 4242 4242`, any future date, any CVC, any ZIP.

## Run locally

You need Node 20.9+ and Python 3.12.

**1. Backend** (http://localhost:8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate              # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                # fill in the values (see the table below)
alembic upgrade head                # create the tables
python seed.py                      # demo data (python seed.py --reset wipes and re-seeds)
uvicorn app.main:app --reload --port 8000
```

**2. Frontend** (http://localhost:3000), in a second terminal

```bash
cd frontend
npm install
cp .env.example .env.local          # API_URL=http://localhost:8000
npm run dev
```

The browser only calls `/api/...` on port 3000; Next.js forwards those requests to `API_URL`.

**Checks**

```bash
cd backend  && ruff check . && pytest          # DB tests use a throwaway schema in your database
cd frontend && npm run lint && npm run typecheck && npm run build
```

## Deploy

Deploy the API first, then the frontend, then connect them.

**1. API on Render**

1. Push the repo to GitHub.
2. In Render: **New > Blueprint**, then pick the repo. It reads `render.yaml` and creates `apex-api` from `backend/`.
3. Fill in the variables it asks for (table below). `JWT_SECRET` is generated for you. Each start runs
   `alembic upgrade head`, so the tables are created automatically.
4. Seed the database once from your computer: `cd backend && python seed.py`, with `backend/.env` pointing
   at the same Neon database. If you already seeded it locally, skip this.
5. Open `https://<your-api>.onrender.com/health`. It should say `"database":"ok"`.

**2. Frontend on Vercel**

1. In Vercel: **Add New > Project**, then import the repo.
2. Set **Root Directory** to `frontend` (Next.js is detected).
3. Add `API_URL` = `https://<your-api>.onrender.com` (no trailing slash), then **Deploy**.

**3. Connect them**

1. In Render, set `FRONTEND_URL` to your Vercel URL (e.g. `https://apex-xyz.vercel.app`) and redeploy.
2. In Stripe (test mode): **Developers > Webhooks > Add endpoint**
   - URL: `https://<your-api>.onrender.com/api/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`
   - Copy the signing secret (`whsec_...`) into Render as `STRIPE_WEBHOOK_SECRET` and redeploy.

Free Render services sleep after 15 minutes without traffic; the first request after that takes 30-60 seconds.
Pages show a "Try again" button if the API is still waking up.

## Environment variables

**Render (backend)**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string (used for migrations) |
| `JWT_SECRET` | Long random string (Render generates it) |
| `STRIPE_SECRET_KEY` | Stripe test secret key, `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | From the Stripe webhook endpoint, `whsec_...` |
| `FRONTEND_URL` | Your Vercel URL, used for Stripe redirects and CORS |
| `ENVIRONMENT` | `production` (set by `render.yaml`; makes the session cookie Secure) |

**Vercel (frontend)**

| Variable | Value |
|---|---|
| `API_URL` | Your Render URL, e.g. `https://apex-api.onrender.com` |

That's the only frontend variable: Stripe runs on its hosted checkout page, so no publishable key is needed.
Both `.env.example` files list every variable. Never commit real values.

## Local Stripe webhooks (optional)

Locally, the success page asks the API to confirm the payment directly with Stripe, so orders turn **paid**
without a webhook. To test the webhook itself, install the Stripe CLI and run
`stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`. Put the `whsec_...` it prints in
`backend/.env` as `STRIPE_WEBHOOK_SECRET`.
