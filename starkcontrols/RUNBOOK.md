# StarkControls Runbook

Provisioning and deployment for SVH-PROD-007. **Stub — Session 01.** Incident
response, backup/restore and on-call rotation land in a later session.

Everything below needs credentials that are not in this repo, so each command is
written out to be run by an operator. No command here contains a real value:
placeholders are in `ANGLE_BRACKETS`.

---

## 0. One-time prerequisites

```bash
npm  i -g wrangler                 # >= 3.90
brew install supabase/tap/supabase # or see supabase.com/docs/guides/cli
curl -L https://fly.io/install.sh | sh
```

Authenticate each CLI once:

```bash
wrangler login
supabase login
fly auth login
```

---

## 1. Supabase — link and push the schema

```bash
cd starkcontrols

# Link the working tree to the project (ref is in the dashboard URL).
supabase link --project-ref <SUPABASE_PROJECT_REF>

# Apply db/migrations/0001_core.sql.
supabase db push

# Verify: 11 tables, all with RLS enabled.
supabase db execute --file /dev/stdin <<'SQL'
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' order by tablename;
SQL
```

Regenerate the shared TypeScript types after every migration and commit the
result:

```bash
supabase gen types typescript --linked --schema public \
  > packages/shared/src/database.types.ts
```

> `supabase gen types` shells out to Docker. On a host without a Docker daemon,
> `python db/gen_types.py "$DATABASE_URL"` produces the same file by
> introspecting the database directly.

**The `org_id` claim.** The RLS policies compare `auth.jwt() ->> 'org_id'`
against `projects.org_id`, so that claim has to be in the access token. Add it
with a Custom Access Token hook in the Supabase dashboard
(Authentication → Hooks), reading the user's org from your own mapping table.
Without it, every authenticated query returns zero rows.

Connection strings (Dashboard → Project Settings → Database):

* **Transaction pooler** (port 6543) → `DATABASE_URL` for `apps/compute` and the
  connection string you hand to Hyperdrive.
* **Direct** (port 5432) → migrations only.

---

## 2. Cloudflare — R2 bucket

```bash
wrangler r2 bucket create starkcontrols-files
wrangler r2 bucket create starkcontrols-files-preview   # used by `wrangler dev`

# Confirm.
wrangler r2 bucket list
```

The compute service reads the same bucket over the S3 API, so it needs an R2
access key pair: Cloudflare dashboard → R2 → **Manage R2 API Tokens** → create a
token scoped to `starkcontrols-files` with *Object Read* permission. That yields
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and the account endpoint
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com` for `R2_ENDPOINT`.

---

## 3. Cloudflare — Hyperdrive

```bash
wrangler hyperdrive create starkcontrols-db \
  --connection-string "postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres"
```

The command prints an id. That value is `HYPERDRIVE_ID`: paste it into **both**
`[[hyperdrive]]` blocks in `apps/edge/wrangler.toml`, replacing
`REPLACE_WITH_HYPERDRIVE_ID`. It is account-scoped rather than secret, so it
belongs in the committed config, not in `wrangler secret`.

```bash
wrangler hyperdrive list   # confirm
```

---

## 4. Cloudflare — Worker secrets and deploy

Generate the shared HMAC key once and use the *same* value for the Worker and
the compute service:

```bash
openssl rand -hex 32          # -> COMPUTE_API_KEY
```

```bash
cd starkcontrols/apps/edge

wrangler secret put SUPABASE_JWT_SECRET   # Supabase dashboard > Settings > API > JWT Secret
wrangler secret put COMPUTE_API_URL       # https://starkcontrols-compute.fly.dev
wrangler secret put COMPUTE_API_KEY       # the openssl value above

wrangler secret list                      # names only, never values

wrangler deploy --env production
```

Smoke test:

```bash
curl https://starkcontrols-edge.<SUBDOMAIN>.workers.dev/healthz
curl -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
     https://starkcontrols-edge.<SUBDOMAIN>.workers.dev/projects
```

---

## 5. Fly.io — compute service

```bash
cd starkcontrols/apps/compute

# fly.toml is already committed; --no-deploy so secrets land before the first boot.
fly launch --no-deploy --copy-config --name starkcontrols-compute --region ord

fly secrets set \
  DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres" \
  COMPUTE_API_KEY="<same value as the Worker>" \
  R2_ACCESS_KEY_ID="<from step 2>" \
  R2_SECRET_ACCESS_KEY="<from step 2>" \
  R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com" \
  ANTHROPIC_API_KEY="<unused in Session 01; register now>" \
  --app starkcontrols-compute

fly deploy --app starkcontrols-compute

fly status  --app starkcontrols-compute
fly logs    --app starkcontrols-compute
```

Smoke test:

```bash
curl https://starkcontrols-compute.fly.dev/healthz
curl https://starkcontrols-compute.fly.dev/readyz    # "database": true once DATABASE_URL is live
```

`min_machines_running = 1` keeps a warm machine: an import must not pay a cold
start inside the Worker's request budget.

---

## 6. Vercel — web

```bash
cd starkcontrols/apps/web
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_BASE
vercel deploy --prod
```

Set the project root to `starkcontrols/apps/web` and the install command to
`pnpm install` at the workspace root.

---

## 7. Rotating the HMAC key

The Worker and the compute service share one secret, so rotation is ordered:

1. `fly secrets set COMPUTE_API_KEY=<new>` — Fly restarts the machine.
2. `wrangler secret put COMPUTE_API_KEY` — enter the same new value.

Imports fail with 401 in the window between the two; do it outside a cutover.

---

## 8. Verifying tenant isolation after any schema change

```sql
-- as a tenant, against a database with the auth shim or on Supabase
set local role authenticated;
set local "request.jwt.claims" = '{"org_id":"<ORG_A_UUID>"}';

select count(*) from projects;    -- only org A's rows
insert into pcos (project_id, pco_number, title)
values ('<ORG_B_PROJECT_UUID>', 'PCO-1', 'should fail');
-- expected: ERROR new row violates row-level security policy
```
