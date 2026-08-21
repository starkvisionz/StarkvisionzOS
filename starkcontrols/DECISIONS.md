# Decisions

Judgment calls made while building StarkControls, with the reasoning. One
section per session.

---

## Session 01 — Foundation

### D-01 · The platform lives in `starkcontrols/`, not at the repo root

The `StarkvisionzOS` repository already contains an unrelated Vite + Express
application at its root (`src/`, `server/`, `package.json`). The spec's tree is
rooted at `starkcontrols/`, so that is taken literally: the new monorepo is a
subdirectory and nothing existing was moved, renamed or deleted. CI paths and
the runbook are written accordingly.

### D-02 · Migration 0001 was validated locally, not pushed to Supabase

Two Supabase projects are reachable from this environment — `claims-attorney-helper`
and `fabtrack` — and neither is StarkControls. Pushing this schema into either
would corrupt an unrelated product, so `supabase db push` was **not** run. The
spec's stated fallback was taken: exact CLI instructions are in
[RUNBOOK.md §1](./RUNBOOK.md).

The migration is not merely untested, though. It was applied to a local
Postgres 16 cluster, which confirmed:

* all 11 tables create cleanly, with RLS enabled and an `org_isolation` policy
  on each;
* a tenant with `org_id = A` sees only org A's projects and activities;
* an insert by org A into org B's project is rejected by the policy;
* a session with no `org_id` claim sees nothing;
* the generated `is_critical` column computes as specified.

### D-03 · RLS is also enabled on `orgs`

The spec enumerates policies for `projects` and its children. `orgs` was left
implicit, but without RLS every tenant could read the full customer list through
the anon key. It gets the obvious policy: `id = auth.jwt() ->> 'org_id'`.

### D-04 · Policies use `USING` only, matching the spec's `projects` policy

Postgres reuses a policy's `USING` expression as its `WITH CHECK` when the
latter is absent, so `for all … using (…)` constrains writes exactly as it
constrains reads. The child policies mirror the shape given for `projects`
rather than adding explicit `with check` clauses. Verified: a cross-org insert
raises *new row violates row-level security policy*.

### D-05 · `db/seed/local_auth_shim.sql` for non-Supabase Postgres

The policies call `auth.jwt()`, which only exists on Supabase. A plain Postgres
cannot even parse them. The shim recreates `auth.jwt()` over the
`request.jwt.claims` GUC — the same mechanism Supabase uses — plus the `anon` and
`authenticated` roles. It is local/CI only and is never applied to Supabase.

### D-06 · Types are generated, but by a docker-free script

`supabase gen types typescript` runs pg-meta in a container and this environment
has no Docker daemon. `db/gen_types.py` introspects `information_schema` and
`pg_catalog` and emits the identical file shape (`Row`/`Insert`/`Update`/
`Relationships`, plus the `Tables<>` helpers). The committed
`packages/shared/src/database.types.ts` was generated from the real migrated
schema, so it is accurate rather than hand-written. The canonical CLI command
stays the documented path in the runbook.

Generated columns (`activities.is_critical`) appear in `Row` but are omitted
from `Insert`/`Update`, since Postgres rejects writes to them.

### D-07 · XER wall-clock timestamps are attached to UTC

P6 writes dates as bare local wall-clock with no offset, and an XER carries no
IANA zone. Rule 2 requires stored instants be timezone-aware UTC, so the parser
attaches `UTC` to the parsed wall-clock value rather than guessing an offset.
`projects.timezone` remains the record of the site-local zone, which keeps the
conversion recoverable if a later session needs true instants. Documented at the
top of `core/xer_parse.py` so nobody mistakes it for a real conversion.

### D-08 · Percent complete honours `complete_pct_type`

The contract asks for one `pct_complete` field, but P6 stores three percentages
and a selector. The parser reads the selector: `CP_Phys` → `phys_complete_pct`,
`CP_Units` → `act_complete_pct`, `CP_Drtn` → derived as
`(1 − remaining ÷ original) × 100`, since duration percent complete is computed
rather than stored. Values are clamped to 0–100 and quantised to `numeric(5,2)`.

### D-09 · A multi-project XER is scoped to its first `PROJECT` row

A P6 export can contain several projects. Since a snapshot belongs to exactly
one project, the first `PROJECT` row is treated as primary and `PROJWBS`, `TASK`
and `TASKPRED` rows are filtered to its `proj_id`. Rows with no `proj_id` column
are kept, so single-project exports are unaffected.

### D-10 · Relationships with a dangling endpoint are dropped

`TASKPRED` references internal `task_id`s, but `relationships` is keyed on
activity ids. A link whose predecessor or successor is not in the file (an
external or deleted task) cannot be represented, so it is skipped rather than
imported with a null endpoint. Covered by a test.

### D-11 · The parser sits behind a swappable protocol

The existing SVH parser is not in this repo yet. `core/xer_parse.py` exposes a
`ScheduleParser` protocol with `parse(source) -> ParsedSchedule`, a module-level
`parse_xer()`, and `set_parser()`. Dropping in the existing implementation later
is a one-line change and no caller moves.

### D-12 · Decimals cross the wire as strings

Pydantic serialises `Decimal` to a JSON string, and postgres.js returns
`numeric` as a string. Both are left alone: the wire contracts in
`packages/shared` type every money and duration field as `string`, and an ESLint
rule bans `parseFloat` in the Worker. A `numeric(15,2)` value exceeds the exact
range of an IEEE double, so passing them as JSON numbers would silently lose
cents.

### D-13 · `POST /uploads/xer` takes `project_id` from the query string

The spec fixes the R2 key layout, which embeds a project id, but does not say
how the route learns it. It is read from the `project_id` query parameter, or
from a `project_id` field on a multipart request. Ownership is checked against
the caller's org before anything is written, so an unauthorised upload leaves no
object behind.

### D-14 · The 100 MB cap is checked before the body is read

`Content-Length` is checked first, so an oversized upload is refused without
buffering it; the decoded size is then re-checked as a backstop for chunked
requests with no declared length.

### D-15 · Worker tests drive `app.fetch` with typed doubles rather than workerd

The spec suggests miniflare / `unstable_dev`. Both boot a real workerd process,
and the Hyperdrive binding then needs a live Postgres — which would make the
`edge-web` CI job depend on a database service and turn a unit suite into an
integration suite. Instead the Hono app is exercised through its own
`fetch(request, env, ctx)` entry point with a recording postgres.js double, an
in-memory R2 bucket and a typed `fetch` stub. The routing, JWT verification,
tenant scoping, key derivation and signing paths are all real code; only the
bindings are substituted. The suite is hermetic and runs in ~1 s.

The one thing this cannot prove is that postgres.js works over Hyperdrive inside
workerd. That is covered by the deploy smoke test in the runbook.

### D-16 · Cross-org access returns 404, not 403

`requireProjectInOrg` filters on `org_id` in SQL and raises 404 when nothing
matches. A 403 would confirm that the project exists, which leaks the existence
of another tenant's data. The same rule applies to malformed uuids, which are
rejected before any query runs.

### D-17 · The Worker repeats the org filter that RLS already enforces

The Worker reaches Postgres through Hyperdrive using a pooled role, not an
end-user JWT, so `auth.jwt()` is empty on that connection and RLS cannot scope
those queries. Every Worker query therefore carries an explicit `org_id`
predicate. Where a request does reach the database as an end user (the browser
talking to Supabase directly), RLS is the enforcement point. Both are kept.

### D-18 · `HYPERDRIVE_ID` lives in `wrangler.toml`, not in `wrangler secret`

It is registered in the env var registry, but a Hyperdrive config id is an
account-scoped identifier rather than a credential, and wrangler resolves
bindings from the config file at build time — it cannot read the id from a
secret. It is committed as `REPLACE_WITH_HYPERDRIVE_ID` and listed in
`apps/edge/.env.example` so deploy tooling still has the name.

### D-19 · `apps/web` drops the Geist web fonts

`create-next-app` wires up `next/font/google`, which fetches font files at build
time. That makes `next build` fail on any network-restricted runner. The
scaffold uses the system font stack instead; the brand tokens
(`--void-black`, `--sovereign-gold`) are exposed to Tailwind v4 through
`@theme inline`, which is what Session 02 needs.

shadcn/ui is scaffolded but not populated: `components.json` and `lib/utils.ts`
(the `cn` helper) are in place so `pnpm dlx shadcn add …` works, with no
components pulled in this session.

### D-20 · `.npmrc` hoists ESLint plugins

`eslint-config-next` depends on its plugins transitively, and pnpm's strict
`node_modules` layout hides them from ESLint's resolver. `public-hoist-pattern[]=*eslint*`
is the supported fix and keeps `pnpm -r lint` working from a clean install.

### D-21 · Integration tests are opt-in, and provision their own database

`pytest -m integration` needs a real Postgres. It uses `DATABASE_URL` when set,
falls back to testcontainers when Docker is available, and skips otherwise. Each
run creates and drops its own database, so it never touches an existing schema.
CI runs `-m "not integration"`, as specified.

### D-22 · `pandas` is a dependency without a caller yet

It is part of the locked stack and the EVM work in a later session needs it, so
it is pinned now (`>=2.2,<2.3`) rather than added later. Nothing in Session 01
imports it.

### D-23 · The CI workflow is mirrored to the repository root

GitHub only executes workflows found in the root `.github/workflows/`, but the
spec places the file at `starkcontrols/.github/workflows/ci.yml` (it assumes
`starkcontrols/` is the repo root — see D-01). Both files exist and are kept
byte-identical: the root copy is what runs, the in-tree copy is what the spec
asks for, and a `workflow-sync` job diffs the two so they cannot silently drift.
