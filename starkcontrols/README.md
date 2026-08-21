# StarkControls

**SVH-PROD-007** — project controls platform for Starkvisionz Holdings, Inc.

Schedule ingestion (Primavera P6 XER), cost accounts, change management and
earned value, built as three deployable units around one Supabase Postgres.

---

## Architecture

```
                     ┌──────────────────────────────┐
                     │  apps/web — Next.js 15        │
                     │  App Router · Tailwind        │
   browser ─────────▶│  shadcn/ui                    │
                     │  Vercel                       │
                     └───────────────┬───────────────┘
                                     │ Supabase JWT (Bearer)
                                     │ NEXT_PUBLIC_API_BASE
                                     ▼
                     ┌──────────────────────────────┐
                     │  apps/edge — Cloudflare       │
                     │  Worker · Hono 4              │
                     │                               │
                     │  auth.ts    verify HS256 JWT  │
                     │  tenant.ts  org scoping (SQL) │
                     │  hmac.ts    sign outbound     │
                     └───┬───────────┬───────────┬───┘
                         │           │           │
        Hyperdrive       │           │ R2 put    │ HMAC-signed POST
     (pooled Postgres)   │           │           │
                         ▼           ▼           ▼
             ┌────────────────┐ ┌─────────┐ ┌──────────────────────────┐
             │  Supabase      │ │   R2    │ │ apps/compute — FastAPI    │
             │  Postgres 15+  │ │ bucket  │ │ Python 3.12 · pandas      │
             │                │ │ STARK-  │ │ Fly.io                    │
             │  RLS: org_id   │ │CONTROLS │ │                           │
             │  on every      │ │ _FILES  │ │ core/xer_parse.py         │
             │  table         │ │         │ │ POST /xer/parse           │
             └────────▲───────┘ └────▲────┘ │ POST /xer/import          │
                      │              │      └───────┬──────────┬────────┘
                      │              └──────────────┘          │
                      └─────────────────────────────────────────┘
                          transaction pooler · COPY bulk load

  packages/shared — generated database.types.ts + wire contracts (TS)
  db/migrations   — 0001_core.sql (11 tables, RLS on all of them)
```

### Request path for a schedule import

1. `POST /uploads/xer?project_id=…` — Worker verifies the JWT, confirms the
   project belongs to the caller's org, writes the file to
   `orgs/{org_id}/projects/{project_id}/xer/{uuid}.xer` and returns the key.
2. `POST /projects/:id/import` — Worker re-checks ownership, then makes an
   HMAC-signed call to the compute service.
3. Compute fetches the object from R2, parses it, and in **one transaction**
   upserts the WBS, inserts a `schedule_snapshots` row, and bulk-loads
   activities and relationships with `COPY`.

### Invariants

| Rule | Where it is enforced |
| --- | --- |
| Money is `numeric(15,2)` / `Decimal` — never a float | migration column types; `optionalMoney` in `projects.ts`; `Decimal` in `xer_parse.py`; an ESLint rule bans `parseFloat` |
| Stored instants are timezone-aware UTC | `timestamptz` columns; `_to_datetime` attaches UTC |
| A tenant sees only its own rows | RLS policy on all 11 tables **and** an `org_id` filter in every Worker query |
| Secrets never enter git | `.env*` gitignored from the first commit; gitleaks job in CI |

---

## Layout

```
starkcontrols/
├── apps/
│   ├── edge/       Cloudflare Worker (Hono) — API surface
│   ├── compute/    FastAPI service — XER parsing and ingestion
│   └── web/        Next.js 15 scaffold — brand tokens only in Session 01
├── db/
│   ├── migrations/ 0001_core.sql
│   ├── seed/       local_auth_shim.sql (local Postgres only)
│   └── gen_types.py
├── packages/shared/ generated DB types + wire contracts
└── .github/workflows/ci.yml
```

---

## Local development

Prerequisites: Node 22 + pnpm 10, Python 3.12 + [uv](https://docs.astral.sh/uv/),
and a Postgres you can write to (local, or a Supabase branch).

```bash
git clone <repo> && cd starkcontrols
pnpm install
```

### apps/compute — FastAPI

```bash
cd apps/compute
cp .env.example .env            # then fill in DATABASE_URL, COMPUTE_API_KEY, R2_*
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8080
```

Check it: `curl localhost:8080/healthz`

Every `/xer/*` route requires a signature, so calls need one too:

```bash
BODY='{"r2_key":"orgs/…/x.xer"}'
SIG=$(python -c "import hmac,hashlib,os,sys;print(hmac.new(os.environ['COMPUTE_API_KEY'].encode(),sys.argv[1].encode(),hashlib.sha256).hexdigest())" "$BODY")
curl -X POST localhost:8080/xer/parse -H "Content-Type: application/json" \
     -H "X-SVH-Signature: $SIG" -d "$BODY"
```

Tests:

```bash
uv run ruff check .
uv run pytest -m "not integration"          # the CI gate
DATABASE_URL=postgresql://… uv run pytest -m integration   # round-trip + 50K perf
```

### apps/edge — Cloudflare Worker

```bash
cd apps/edge
cp .env.example .dev.vars       # .dev.vars is what `wrangler dev` reads
# point the Hyperdrive binding at a local database for dev:
export WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgresql://postgres:postgres@localhost:5432/postgres"
pnpm dev
```

Tests: `pnpm test` · `pnpm lint` · `pnpm typecheck`

### apps/web — Next.js

```bash
cd apps/web
cp .env.example .env.local
pnpm dev                        # http://localhost:3000
```

### Database

```bash
# local Postgres, from the repo root
psql "$DATABASE_URL" -f db/seed/local_auth_shim.sql   # local only: stubs auth.jwt()
psql "$DATABASE_URL" -f db/migrations/0001_core.sql

# regenerate the shared types after any schema change
supabase gen types typescript --linked --schema public \
  > packages/shared/src/database.types.ts
```

See [RUNBOOK.md](./RUNBOOK.md) for provisioning and deployment, and
[DECISIONS.md](./DECISIONS.md) for the judgment calls behind the above.
