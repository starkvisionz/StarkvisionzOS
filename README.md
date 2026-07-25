# Starkvisionz OS

An event-sourced, multi-agent AI workspace. The **chat, timeline, audit, and
dashboard are real** — chat streams from the Anthropic Claude API and every turn
is written to an append-only event store, from which the timeline, audit log, and
dashboard projections are rebuilt. The **Lab** views (memory graph, multi-agent
loop, nightshift, agent market, and the rest) are interactive **simulations** of
where the concept could go; each is clearly labeled `Simulated` in the UI.

The frontend is a faithful React/TypeScript implementation of the Claude Design
prototype (`Starkvisionz OS.dc.html`). The visual system is **Nocturne** — its
tokens and component classes live in `src/styles/nocturne.css`, with the app's
darker ground and gradient-filled primary buttons layered on top in
`src/styles/app.css`.

## What's real vs. simulated

| Surface | Status | Backed by |
| --- | --- | --- |
| **Chat** | Real | Anthropic Claude API, streamed over SSE; conversations persisted in SQLite |
| **Timeline** | Real | Live projection of the append-only `events` table (polled) |
| **Audit log** | Real | Raw rows from the `events` table |
| **Dashboard** | Mostly real | Spend, message/token/session counts, and the 7-day spend chart are computed from real data; the agent scorecards and task table are illustrative sample data (marked *illustrative*) |
| **Lab views** | Simulated | Scripted, in-memory interactions — memory graph, loop, branches, replay, market, recovery, counterfactual, truth decay, regret, negotiation, blind spots, nightshift |
| **Settings** | Mixed | System prompt, model, tools, plugins, MCP toggles are in-memory (not yet persisted); the model list is real |

Without an API key the app still runs — chat replies with a clear "no API key
configured" message instead of calling the model, and the event store still
records the turn.

## Architecture

**Frontend** (`src/`)
- `src/api.ts` — client for the backend, including SSE chat streaming.
- `src/os/useController.ts` — all UI state + handlers. Chat, sessions, and the
  event/dashboard feeds are backend-driven; the Lab views run scripted state.
- `src/os/deriveVals.ts` — a pure projection from state to the flat view-model
  the views render (the prototype's `renderVals()`), now fed by real data where
  the surface is real.
- `src/css.ts` — parses the prototype's inline CSS strings into React style
  objects, keeping the styling byte-for-byte faithful to the design.
- `src/components/`, `src/views/` — the sidebar, overlays, and one file per view.

**Backend** (`server/`)
- `server/db.ts` — SQLite (better-sqlite3), genuinely event-sourced. The
  append-only `events` table is the source of truth; `sessions` and `messages`
  are **projections** rebuildable from it. Every command appends its domain
  event(s) **and** applies them to the projection inside one transaction, so the
  log and projection can't drift. `rebuildProjections()` replays the whole log
  to reconstruct the projection from scratch.
- `server/security.ts` — bearer-token auth, CORS allow-listing, a fixed-window
  rate limiter, and request budgets.
- `server/anthropic.ts` — the Anthropic client, the real Claude model roster
  (Opus 5 / Sonnet 5 / Haiku 4.5 / Opus 4.8), and token→cost pricing.
- `server/index.ts` — the Express API: authenticated sessions CRUD, SSE
  `POST /api/chat` streaming from Claude, the `/api/events` feed, and
  `/api/projections/dashboard`. In production it also serves the built frontend.
- `server/verifyEvents.ts` — `npm run verify:events` asserts the projection
  replays identically from the log and that deleting a conversation preserves
  its analytics.

### Security & data model

- **Auth.** The API is protected by a shared bearer token (`SVOS_AUTH_TOKEN`).
  When set, every `/api` call (except `/api/health`) requires it; the web client
  prompts once and stores it locally. When unset, the API serves **loopback
  only** and refuses remote callers — an unconfigured public deployment is closed
  by default. **Set `SVOS_AUTH_TOKEN` before exposing the server to a network.**
- **CORS** is closed by default; cross-origin is opt-in via
  `SVOS_ALLOWED_ORIGINS`.
- **Budgets & rate limits.** Per-token/IP fixed-window limits on `/api` and a
  tighter one on `/api/chat`, a max prompt length, and a per-reply `max_tokens`
  ceiling (all env-tunable — see `.env.example`).
- **Event actor** is derived from configuration (`SVOS_ACTOR`, default
  `operator`), not hard-coded.
- **Deletion is a tombstone.** Deleting a conversation appends a
  `session.deleted` event and soft-deletes the projection row; the underlying
  `message.created` events remain, so historical spend, tokens, and counts —
  which the dashboard computes from the immutable event log — are never erased.
  The audit log and dashboard therefore stay consistent.

## Develop

```bash
npm install

# Provide a key to enable real streaming Claude responses (see .env.example).
export ANTHROPIC_API_KEY=sk-ant-...

npm run dev        # runs the Vite dev server + the API together (concurrently)
```

- Web: http://localhost:5173 (Vite proxies `/api` → the API on 8787)
- API: http://localhost:8787

Other scripts:

```bash
npm run build      # typecheck (tsc -b) + production build of the frontend
npm run start      # run the API server; also serves the built dist/ if present
npm run typecheck  # typecheck both the app and the server
```

The event store is a SQLite file at `server/data/svos.db` (gitignored). Requires
Node 18+. Icons are [Phosphor](https://phosphoricons.com/); the type family is
Inter. Chat defaults to `claude-opus-5`.
