# Apex Marketplace

An Amazon-style marketplace built from [PRD.md](PRD.md): browse, search, product pages, cart, Stripe checkout
(test mode), order tracking, and a seller workspace.

```
frontend/   Next.js 16 (App Router, Tailwind v4)       -> Vercel
backend/    FastAPI, SQLAlchemy 2, Alembic, Stripe       -> Vercel (or Render)
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

You need Node 20.9+ and Python 3.12. Do the one-time setup in steps 1 and 2, then start
**both** apps with one command from the repo root:

```bash
npm run dev        # API on :8000 + web on :3000, Ctrl+C stops both
```

The web app needs the API: if only the frontend is running, pages show "We couldn't reach the store"
and the terminal prints `ECONNREFUSED ... :8000`.

**1. Backend** (http://localhost:8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate              # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                # fill in the values (see the table below)
alembic upgrade head                # create the tables
python seed.py                      # demo data (see "Where the data lives" below about --reset)
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

## Deploy backend on Vercel

Use this instead of Render if you'd rather not add a card: the API runs as Vercel Functions on the free
(Hobby) plan, in a **second** Vercel project next to the frontend.

**What's already set up in `backend/`**

- `pyproject.toml` lists the runtime dependencies (Vercel installs from it, not from `requirements.txt`),
  sets Python 3.12 (also in `.python-version`) and points Vercel at `app.main:app`.
- `vercel.json` runs the function in `cle1` (Cleveland, next to Neon's `us-east-2`) and leaves tests,
  migrations, seed scripts and dev files out of the bundle. The install is about 85 MB (the limit is 250 MB).
- On Vercel the API opens one database connection per request and closes it after (Neon's pooler does the
  pooling), and stores failed sign-ins in Postgres, so nothing depends on memory or local disk.
- Nothing runs migrations or the seed on deploy. **Whenever a pull adds a file under
  `backend/alembic/versions/`, run `alembic upgrade head` from your computer before (or right after)
  deploying**, or the new code will hit a table or column that doesn't exist yet.

**Steps**

1. **Apply the migrations from your computer** before the first deploy, even if the database is
   already set up (later migrations add tables such as `login_attempts`):
   ```bash
   cd backend && alembic upgrade head      # uses DATABASE_URL_UNPOOLED from backend/.env
   ```
   Seed only if the database is empty (`python seed.py`).
2. In Vercel: **Add New > Project**, import the same repo, and set **Root Directory** to `backend`.
   Leave Framework Preset as detected (FastAPI) and the build settings empty.
3. Add the environment variables below (Production and Preview), then **Deploy**.
4. Open `https://<your-api>.vercel.app/health`. It should say `"status":"ok"`. If it answers 503 with
   `"missing_tables": [...]`, the migrations from step 1 haven't been applied to the database this
   deployment uses: run `alembic upgrade head` against it.
5. In the **frontend** project, set `API_URL` = `https://<your-api>.vercel.app` (no trailing slash) and redeploy.
6. In Stripe (test mode): **Developers > Webhooks > Add endpoint**
   - URL: `https://<your-api>.vercel.app/api/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`
   - Copy the signing secret into the backend project as `STRIPE_WEBHOOK_SECRET` and redeploy.

**Backend project variables**

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (host contains `-pooler`) |
| `JWT_SECRET` | yes | Long random string, e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `STRIPE_SECRET_KEY` | yes | Stripe test secret key, `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | yes | From the Stripe webhook endpoint in step 6, `whsec_...` |
| `FRONTEND_URL` | yes | Your frontend URL, e.g. `https://apex-xyz.vercel.app` (no trailing slash). Used for Stripe redirects and CORS |
| `ENVIRONMENT` | yes | `production` (makes the session cookie Secure) |
| `CORS_ORIGINS` | no | Comma-separated extra origins, only if the API must answer more than `FRONTEND_URL` (it replaces it) |
| `DATABASE_URL_UNPOOLED` | no | Neon **direct** string. Only migrations use it, and they run from your computer, so it can be left out |

`VERCEL` is set by Vercel itself; the API uses it to switch to one connection per request.
If a request answers 500, open the backend project's **Logs** and search for `database error`: each entry
has the error class, the SQLSTATE, Postgres's message and the failing SQL (with placeholders, never the
values).
Vercel deployment protection is off for production URLs by default; if you turn it on, Stripe's webhook calls
will be blocked.

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

## Where the data lives

The API stores everything in Neon project **apex**, branch **production** (the default branch), database
**neondb**, schema **public**. Users are in the `users` table. In the Neon console: Tables, then
`public.users`, or SQL Editor: `select id, name, email, created_at from users order by id desc;`

`python seed.py --reset` empties every table and re-seeds the demo. It refuses to run while real sign-ups
exist (any email outside `@apex.demo` / `@reviewers.apex.demo`), because they would be deleted. To delete
them anyway on a dev database: `python seed.py --reset --wipe-real-users`.
