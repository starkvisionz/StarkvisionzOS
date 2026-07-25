# Starkvisionz OS (Prototype)

> ⚠️ **Non-production front-end prototype.** This is a UI demo only. **Every
> feature is simulated** — all data is mock, there is **no backend, no database,
> no real AI/model calls, no MCP connectors, and nothing is ever deployed**. No
> button performs a real side effect; "streaming" replies are canned text on a
> timer, "costs" and "spend" are made up, and the "event store," "providers,"
> "approvals," and "deploys" are all fixtures. Do not point this at real
> credentials or treat any number, log, or action in it as real. The UI labels
> this too: a persistent banner across the top and a `Simulated` tag on every
> view.

A design concept for an event-sourced, multi-agent AI workspace. The idea it
illustrates: every turn — a chat message, a tool call, an approval, a deploy —
would be an immutable event, and every view is a **projection rebuilt from that
event store**. Chat routes across providers (ChatGPT, Hermes, Forge, Claude)
through one Hub, and the "Lab" shows things a normal chat UI can't: a queryable
memory graph, a multi-agent review loop, truth-decay tracking, regret scoring,
and more. **None of that machinery exists here** — this repo is only the
front-end that portrays it.

This is a faithful React/TypeScript implementation of the Claude Design prototype
(`Starkvisionz OS.dc.html`). The visual system is **Nocturne** — its tokens and
component classes live in `src/styles/nocturne.css`, with the app's darker ground
and gradient-filled primary buttons layered on top in `src/styles/app.css`.

## What's simulated (i.e. everything)

| Appears to… | Actually… |
| --- | --- |
| Route chat to ChatGPT / Hermes / Forge / Claude and stream a reply | Picks a hard-coded string and reveals it word-by-word on a `setInterval` — no network, no model |
| Show a live event stream, token counts, and dollar spend | Appends random fixtures from a fixed pool; all tokens/costs are literals in the source |
| Deploy, run autonomous recovery, replay a decision, run a nightshift | Advances a scripted, timed animation; nothing runs or ships |
| Connect/disconnect MCP servers, toggle tools & plugins | Flips a boolean in local React state; no server is contacted |
| Approve/reject an agent action, save settings, close a blind spot | Updates in-memory state only; **nothing persists** across a reload |
| Query the memory graph / re-verify a claim | Returns a pre-written answer after a short delay |

All state is in-memory and resets on refresh. There is no persistence, no auth,
and no external I/O of any kind.

## Views

**Main**
- **Chat** — provider-routed thread with streaming, tool calls, code blocks, and
  inline approval gates; per-session token/cost meter; model picker.
- **Dashboard** — agent operations projection: first-pass rate, spend chart
  (productive vs. rework), "needs you" queue, per-agent trust, cost-attribution table.
- **Timeline** — the live, immutable event stream (auto-appends; pause/resume).
- **Audit log** — raw append-only signed events; corrections are new events.

**Lab**
- **Multi-agent loop** — author drafts, reviewers score & critique, notes fold
  into the next round until the score clears the target.
- **Memory graph** — an SVG knowledge graph built from event links, with a
  "trace the why" query, depth control, type filters, and a provenance panel.
- **Agent branches** — fork one decision into parallel agent explorations and merge one.
- **Model replay** — re-run an old decision through a newer model and diff the result.
- **Agent market** — agents ranked by verified success, cost, and latency per category.
- **Auto-recovery** — closed-loop deploy-failure → diagnosed → tested → approved → verified.
- **Counterfactual** — project the alternate outcome of a different past choice.
- **Truth decay** — each claim carries a confidence half-life; re-verify against the source.
- **Regret index** — decisions re-scored in hindsight against what actually happened.
- **Negotiation room** — deadlocked agents trade concessions instead of re-scoring.
- **Blind spot map** — the gaps agents keep filling with assumptions, ranked and closable.
- **Nightshift** — overnight the Hub replays the day and leaves a morning brief.

**Global**
- **Command palette** (⌘K / Ctrl-K) — jump to any view or run any action.
- **Time travel** — scrub the project to an earlier point in the event history.
- **Settings** — system prompt, tools, plugins, MCP connectors, risk policy
  (the "cost of being wrong" dial), memory & retention, providers, appearance.

## Architecture

The prototype was a single stateful component; this port keeps that shape but
splits it into clear layers:

- `src/os/types.ts` — domain + UI-state types.
- `src/os/data.ts`, `src/os/labdata.ts` — the static data and seed builders.
- `src/os/useController.ts` — all state and handlers (the class methods, as a hook).
- `src/os/deriveVals.ts` — a pure projection from raw state to the flat view-model
  the views render (the prototype's `renderVals()`).
- `src/css.ts` — a tiny helper that parses the prototype's inline CSS strings into
  React style objects, so the styling stays byte-for-byte faithful to the design.
- `src/components/`, `src/views/` — the sidebar, overlays, and one file per view.

## Develop

```bash
npm install
npm run dev        # start the dev server
npm run build      # typecheck (tsc -b) + production build
npm run preview    # preview the production build
```

Requires Node 18+. Icons are [Phosphor](https://phosphoricons.com/); the type
family is Inter.
