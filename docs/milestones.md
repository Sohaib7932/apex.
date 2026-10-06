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
