# Apex Marketplace

An Amazon-style marketplace built from [PRD.md](PRD.md): Next.js frontend, FastAPI backend, Postgres on Neon, Stripe in test mode.

```
frontend/   Next.js 16 (App Router, Tailwind v4)        -> Vercel
backend/    FastAPI + SQLAlchemy 2 + Alembic             -> Render
design/     reference screenshots
docs/       milestone log (what changed, and why)
```

## Run locally

Requirements: Node 20.9+, Python 3.12.

### 1. Environment files

```bash
cp backend/.env.example backend/.env           # then fill in DATABASE_URL etc.
cp frontend/.env.example frontend/.env.local
```

`.env` files are gitignored; never commit real values.

### 2. Backend (http://localhost:8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Check: http://localhost:8000/health returns `{"status":"ok","database":"ok",...}`. API docs: http://localhost:8000/api/v1/docs

### 3. Frontend (http://localhost:3000)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The home page shows a live API and database status card. The browser calls `/api/...` on port 3000, and Next.js forwards it to `API_URL`.

### Checks

```bash
cd backend  && ruff check . && ruff format --check . && pytest
cd frontend && npm run lint && npm run typecheck && npm run build
```

## Deploy

### API on Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → choose the repo. Render reads `render.yaml` and creates `apex-api` (root dir `backend/`).
3. When prompted, set `DATABASE_URL` (Neon **pooled** string), `DATABASE_URL_UNPOOLED` (Neon direct string), and the Stripe keys (they can stay empty for now). Set `CORS_ORIGINS` to your Vercel URL; you can come back for that after step 2 of the Vercel section. `JWT_SECRET` is generated for you.
4. Optional: in `render.yaml`, change `region` to the one nearest your Neon region.
5. When the deploy is live, open `https://<your-service>.onrender.com/health`.

Free Render instances sleep after 15 minutes idle, so the first request can take about 30–50 seconds.

### Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Set **Root Directory** to `frontend`. Framework is detected as Next.js.
3. Add the environment variable `API_URL=https://<your-service>.onrender.com` (no trailing slash).
4. Deploy, then open the site. The status card should show API reachable and the database connected.
5. Put the Vercel URL into Render's `CORS_ORIGINS` and redeploy the API.

`API_URL` is read when `next.config.ts` builds the `/api/*` rewrite, so redeploy Vercel after you change it.
