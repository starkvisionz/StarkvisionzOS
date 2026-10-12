# Environment variables

Every name the repository's workflows and deployments consume, where each one
belongs, and how to load them into GitHub Actions in one command.

No real value appears in this file or anywhere else in git. The one file you
fill in — `.env.github` — is gitignored.

---

## Loading them into GitHub

```bash
cp .env.github.example .env.github     # gitignored
$EDITOR .env.github                    # fill in real values; leave unused names blank
scripts/sync-github-env.sh .env.github --dry-run   # show the plan
scripts/sync-github-env.sh .env.github             # write it
```

Needs the [GitHub CLI](https://cli.github.com) and admin rights on the repo
(`gh auth login`). The script is idempotent — re-run it after any rotation.

What it does for you:

* splits each name into an encrypted **secret** or a plain **variable** using
  the table below, so a URL stays readable in a workflow log and a credential
  never is;
* pipes values on stdin, so they never appear in the process table or in shell
  history;
* **refuses** any value still carrying a placeholder from the example file. A
  wrong secret fails at deploy time in ways a missing one does not;
* skips names it does not recognise, so a typo cannot quietly become a secret
  (`--allow-unknown` overrides).

To scope values to a GitHub Environment (separate staging and production
values under the same names), add `--environment production`.

---

## The registry

**Secret** = encrypted, write-only, masked in logs. **Variable** = plain text,
readable in the Actions UI and in logs.

### StarkControls

| Name | GitHub | Also set in | Consumed by |
| --- | --- | --- | --- |
| `DATABASE_URL` | secret | Fly | `apps/compute` — Supabase transaction pooler, port 6543 |
| `DIRECT_URL` | secret | — | migrations only, session pooler, port 5432 |
| `SUPABASE_JWT_SECRET` | secret | `wrangler secret` | `apps/edge` — verifies end-user access tokens |
| `COMPUTE_API_KEY` | secret | Fly **and** `wrangler secret` | the shared HMAC key; one value, both sides |
| `COMPUTE_API_URL` | variable | `wrangler secret` | `apps/edge` — base URL of the compute service |
| `HYPERDRIVE_ID` | variable | `apps/edge/wrangler.toml` | the Hyperdrive binding; account-scoped, not a credential |
| `R2_ACCESS_KEY_ID` | secret | Fly | `apps/compute` — R2 over the S3 API |
| `R2_SECRET_ACCESS_KEY` | secret | Fly | as above |
| `R2_ENDPOINT` | variable | Fly | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `CLOUDFLARE_API_TOKEN` | secret | — | only if a workflow runs `wrangler deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | variable | — | as above |
| `NEXT_PUBLIC_SUPABASE_URL` | variable | Vercel | `apps/web`, build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | secret | Vercel | `apps/web`, build time |
| `NEXT_PUBLIC_API_BASE` | variable | Vercel | `apps/web`, build time |
| `ANTHROPIC_API_KEY` | secret | Fly | registered now, unused until a later session |

`NEXT_PUBLIC_*` values are inlined into the browser bundle, so none of them is
truly private. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still stored as a secret —
masking a key in CI logs costs nothing, and a workflow reads it the same way.

### StarkvisionzOS root app (Vite + Express)

| Name | GitHub | Notes |
| --- | --- | --- |
| `SVOS_AUTH_TOKEN` | secret | bearer token guarding `/api`. **Set this before any non-local deploy** — unset means the API refuses all remote callers |
| `SVOS_ACTOR` | variable | actor recorded on human-initiated events |
| `SVOS_ALLOWED_ORIGINS` | variable | CORS allowlist; empty = same-origin only |
| `SVOS_MAX_PROMPT_CHARS` | variable | |
| `SVOS_MAX_OUTPUT_TOKENS` | variable | |
| `SVOS_RATE_LIMIT` | variable | |
| `SVOS_CHAT_LIMIT` | variable | |
| `SVOS_RATE_WINDOW_MS` | variable | |
| `PORT` | variable | Express listen port |

### Hostinger deployment

Fill in the group that matches your plan; leave the other blank and the script
skips it.

| Name | GitHub | Plan |
| --- | --- | --- |
| `HOSTINGER_FTP_HOST` | variable | shared / Premium / Business |
| `HOSTINGER_FTP_USER` | secret | " |
| `HOSTINGER_FTP_PASSWORD` | secret | " |
| `HOSTINGER_FTP_PATH` | variable | target dir, e.g. `/public_html` |
| `HOSTINGER_SSH_HOST` | variable | VPS |
| `HOSTINGER_SSH_USER` | secret | " |
| `HOSTINGER_SSH_PORT` | variable | " |
| `HOSTINGER_SSH_KEY` | secret | full private key, BEGIN/END lines included |
| `HOSTINGER_DEPLOY_PATH` | variable | target dir on the VPS |

FTP credentials are in hPanel under **Files → FTP Accounts**; SSH details under
**Advanced → SSH Access**.

---

## Rotation

The one ordering constraint is the shared HMAC key, because the Worker and the
compute service must agree on it:

1. `fly secrets set COMPUTE_API_KEY=<new>` — Fly restarts the machine
2. `wrangler secret put COMPUTE_API_KEY` — same value
3. put the same value in `.env.github` and re-run `scripts/sync-github-env.sh`

Imports fail with 401 between steps 1 and 2, so rotate outside a cutover. See
[starkcontrols/RUNBOOK.md](./starkcontrols/RUNBOOK.md) for the rest of
provisioning.
