// Event-sourced persistence for Starkvisionz OS.
//
// The `events` table is the immutable, append-only source of truth. Nothing is
// ever updated or deleted there — even a "delete" is a `session.deleted`
// tombstone event. `sessions` and `messages` are *projections*: caches derived
// from the event log, rebuildable at any time via rebuildProjections().
//
// Every command appends its domain event(s) AND applies them to the projection
// inside a single SQLite transaction, so the log and the projection can never
// drift out of sync. Analytics (spend, tokens, counts) are computed from the
// immutable events, so deleting a conversation never erases its history.

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = process.env.SVOS_DB_PATH || resolve(process.cwd(), "server/data/svos.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF"); // projections are managed by the event applier

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    seq           INTEGER PRIMARY KEY AUTOINCREMENT,
    id            TEXT UNIQUE NOT NULL,
    type          TEXT NOT NULL,
    actor         TEXT NOT NULL DEFAULT 'system',
    summary       TEXT NOT NULL DEFAULT '',
    icon          TEXT NOT NULL DEFAULT 'ph ph-circle',
    dot           TEXT NOT NULL DEFAULT 'var(--color-neutral-400)',
    cost          REAL NOT NULL DEFAULT 0,
    input_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    approval      TEXT NOT NULL DEFAULT 'N/A',
    payload       TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT 'New chat',
    model      TEXT NOT NULL,
    grp        TEXT NOT NULL DEFAULT 'Today',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    role          TEXT NOT NULL,
    content       TEXT NOT NULL DEFAULT '',
    model         TEXT,
    input_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost          REAL NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_seq ON events(seq DESC);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`);

export interface AppSettings {
  sysPrompt: string;
  aboutText: string;
  model: string;
  tools: Record<string, boolean>;
  plugins: Record<string, boolean>;
  guards: Record<string, boolean>;
  mem: Record<string, boolean>;
  appear: Record<string, boolean>;
  stake: string;
  cap: number;
  capAction: string;
  density: string;
  half: number;
}

export const SETTINGS_DEFAULTS: AppSettings = {
  sysPrompt:
    "You are Claude, an agent operating inside Starkvisionz OS — an event-sourced AI workspace.\n\n- Read the shared project context before acting; never ask the human to re-explain the project.\n- Every action you take is logged as an immutable event. Cite evidence (commits, test runs, decisions).\n- Break work into tasks and estimate cost per step.\n- Any action that touches production requires explicit human approval first.",
  aboutText:
    "Eric Stark — project-controls background (WBS, earned value, variance). Prefers concise, decisive answers with the cost and the tradeoff stated up front.",
  model: "claude-opus-5",
  tools: { web: true, code: true, files: true, github: true, coolify: false, terminal: false, postgres: true },
  plugins: { linear: true, slack: true, sentry: false, figma: false, gitguard: true, ledger: false },
  guards: { budget: true, prodWrite: true, secrets: true, netEgress: false },
  mem: { autoPrune: true, contradiction: true, semantic: true, forget: false },
  appear: { glow: true, motion: true, mono: false, thumbs: true },
  stake: "customer",
  cap: 50,
  capAction: "pause",
  density: "compact",
  half: 30,
};

// ── domain events ──
export interface DomainEvent {
  type:
    | "session.created"
    | "session.renamed"
    | "session.deleted"
    | "message.created"
    | "settings.updated"
    | "loop.converged"
    | "nightshift.filed";
  actor: string;
  summary: string;
  icon?: string;
  dot?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  approval?: string;
  payload: Record<string, unknown>;
}

interface StoredEvent {
  id: string;
  type: string;
  actor: string;
  summary: string;
  icon: string;
  dot: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
  approval: string;
  payload: string;
  created_at: string;
}

const insertEvent = db.prepare(`
  INSERT INTO events (id, type, actor, summary, icon, dot, cost, input_tokens, output_tokens, approval, payload, created_at)
  VALUES (@id, @type, @actor, @summary, @icon, @dot, @cost, @input_tokens, @output_tokens, @approval, @payload, @created_at)
`);

const upsertSession = db.prepare(`
  INSERT INTO sessions (id, title, model, grp, created_at, updated_at, deleted_at)
  VALUES (@id, @title, @model, 'Today', @created_at, @created_at, NULL)
  ON CONFLICT(id) DO NOTHING
`);
const setSessionTitle = db.prepare(`UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`);
const setSessionDeleted = db.prepare(`UPDATE sessions SET deleted_at = ? WHERE id = ?`);
const touchSessionStmt = db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`);
const insertMessage = db.prepare(`
  INSERT INTO messages (id, session_id, role, content, model, input_tokens, output_tokens, cost, created_at)
  VALUES (@id, @session_id, @role, @content, @model, @input_tokens, @output_tokens, @cost, @created_at)
  ON CONFLICT(id) DO NOTHING
`);
const upsertSettings = db.prepare(`INSERT INTO settings (k, v) VALUES ('app', @v) ON CONFLICT(k) DO UPDATE SET v = @v`);

/** Apply one stored event to the projection tables. Pure with respect to the
 *  event — running it over the full log rebuilds the projection exactly. */
function applyEvent(e: StoredEvent): void {
  const p = JSON.parse(e.payload) as Record<string, unknown>;
  switch (e.type) {
    case "session.created":
      upsertSession.run({ id: p.sessionId, title: p.title, model: p.model, created_at: e.created_at });
      break;
    case "session.renamed":
      setSessionTitle.run(p.title, e.created_at, p.sessionId);
      break;
    case "session.deleted":
      setSessionDeleted.run(e.created_at, p.sessionId);
      break;
    case "message.created":
      insertMessage.run({
        id: p.messageId,
        session_id: p.sessionId,
        role: p.role,
        content: p.content,
        model: p.model ?? null,
        input_tokens: e.input_tokens,
        output_tokens: e.output_tokens,
        cost: e.cost,
        created_at: e.created_at,
      });
      touchSessionStmt.run(e.created_at, p.sessionId);
      break;
    case "settings.updated":
      upsertSettings.run({ v: JSON.stringify(p.settings) });
      break;
    // loop.converged / nightshift.filed are informational timeline/audit events
    // with no projection to update.
  }
}

/** Append domain events AND update the projection in one transaction. */
export const emit = db.transaction((events: DomainEvent[]): StoredEvent[] => {
  const stored: StoredEvent[] = [];
  for (const ev of events) {
    const row: StoredEvent = {
      id: "evt_" + randomUUID().replace(/-/g, "").slice(0, 20),
      type: ev.type,
      actor: ev.actor,
      summary: ev.summary,
      icon: ev.icon ?? "ph ph-circle",
      dot: ev.dot ?? "var(--color-neutral-400)",
      cost: ev.cost ?? 0,
      input_tokens: ev.inputTokens ?? 0,
      output_tokens: ev.outputTokens ?? 0,
      approval: ev.approval ?? "N/A",
      payload: JSON.stringify(ev.payload ?? {}),
      created_at: new Date().toISOString(),
    };
    insertEvent.run(row);
    applyEvent(row);
    stored.push(row);
  }
  return stored;
});

/** Wipe the projection tables and rebuild them by replaying the whole event
 *  log in order. Proves the projection is fully derived from events. */
export const rebuildProjections = db.transaction((): void => {
  db.prepare(`DELETE FROM messages`).run();
  db.prepare(`DELETE FROM sessions`).run();
  db.prepare(`DELETE FROM settings`).run();
  const all = db.prepare(`SELECT * FROM events ORDER BY seq ASC`).all() as StoredEvent[];
  for (const e of all) applyEvent(e);
});

// ── settings (event-sourced projection) ──
export function getSettings(): AppSettings {
  const row = db.prepare(`SELECT v FROM settings WHERE k = 'app'`).get() as { v: string } | undefined;
  if (!row) return { ...SETTINGS_DEFAULTS };
  try {
    return { ...SETTINGS_DEFAULTS, ...(JSON.parse(row.v) as Partial<AppSettings>) };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function putSettingsCmd(partial: Partial<AppSettings>, actor: string): AppSettings {
  const merged: AppSettings = { ...getSettings(), ...partial };
  emit([{ type: "settings.updated", actor, summary: "Settings updated", icon: "ph ph-gear-six", dot: "var(--color-accent-300)", payload: { settings: merged } }]);
  return merged;
}

export function logConverged(actor: string, summary: string): void {
  emit([{ type: "loop.converged", actor, summary, icon: "ph ph-arrows-clockwise", dot: "var(--color-accent)", payload: {} }]);
}

export function logNightshift(actor: string, summary: string): void {
  emit([{ type: "nightshift.filed", actor, summary, icon: "ph ph-moon-stars", dot: "var(--color-accent)", payload: {} }]);
}

// ── reads ──
export interface EventRow {
  id: string;
  type: string;
  actor: string;
  summary: string;
  evidence: string;
  icon: string;
  dot: string;
  cost: number;
  approval: string;
  created_at: string;
}

export function recentEvents(limit = 40): EventRow[] {
  const rows = db
    .prepare(`SELECT id, type, actor, summary, icon, dot, cost, approval, payload, created_at FROM events ORDER BY seq DESC LIMIT ?`)
    .all(limit) as (StoredEvent & { payload: string })[];
  return rows.map((r) => {
    const p = JSON.parse(r.payload) as Record<string, unknown>;
    return {
      id: r.id,
      type: r.type,
      actor: r.actor,
      summary: r.summary,
      evidence: (p.sessionId as string) || (p.messageId as string) || "",
      icon: r.icon,
      dot: r.dot,
      cost: r.cost,
      approval: r.approval,
      created_at: r.created_at,
    };
  });
}

export interface SessionRow {
  id: string;
  title: string;
  model: string;
  grp: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function listSessions(): SessionRow[] {
  return db.prepare(`SELECT * FROM sessions WHERE deleted_at IS NULL ORDER BY updated_at DESC`).all() as SessionRow[];
}

export function getSession(id: string): SessionRow | undefined {
  return db.prepare(`SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL`).get(id) as SessionRow | undefined;
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  created_at: string;
}

export function listMessages(sessionId: string): MessageRow[] {
  return db.prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC`).all(sessionId) as MessageRow[];
}

export function historyForModel(sessionId: string): { role: "user" | "assistant"; content: string }[] {
  return listMessages(sessionId)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
}

/** Dashboard aggregates — computed from the immutable event log, NOT the
 *  deletable projection rows, so deleting a conversation never rewrites history. */
export function dashboardFromEvents() {
  const agg = db
    .prepare(
      `SELECT
         COALESCE(SUM(cost),0) AS spend,
         COALESCE(SUM(input_tokens + output_tokens),0) AS tokens,
         COUNT(*) AS msgs
       FROM events WHERE type = 'message.created'`,
    )
    .get() as { spend: number; tokens: number; msgs: number };
  const sessionsCreated = (db.prepare(`SELECT COUNT(*) AS n FROM events WHERE type='session.created'`).get() as { n: number }).n;
  const activeSessions = (db.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE deleted_at IS NULL`).get() as { n: number }).n;

  const days: { day: string; date: string; spend: number }[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ day: fmt.format(d), date: d.toISOString().slice(0, 10), spend: 0 });
  }
  const perDay = db
    .prepare(`SELECT substr(created_at,1,10) AS d, COALESCE(SUM(cost),0) AS c FROM events WHERE type='message.created' GROUP BY d`)
    .all() as { d: string; c: number }[];
  const byDate = new Map(perDay.map((r) => [r.d, r.c]));
  for (const day of days) day.spend = byDate.get(day.date) || 0;

  return { spend: agg.spend, tokens: agg.tokens, messages: agg.msgs, sessions: activeSessions, sessionsEver: sessionsCreated, spendDays: days };
}

// ── commands (thin wrappers over emit) ──
export function createSessionCmd(model: string, actor: string, title = "New chat"): SessionRow {
  const id = "s_" + randomUUID().slice(0, 8);
  emit([{ type: "session.created", actor, summary: "New chat started", icon: "ph ph-chats-circle", dot: "var(--color-neutral-400)", payload: { sessionId: id, model, title } }]);
  return getSession(id)!;
}

export function renameSessionCmd(id: string, title: string, actor: string): void {
  emit([{ type: "session.renamed", actor, summary: "Renamed chat", icon: "ph ph-pencil-simple", dot: "var(--color-neutral-500)", payload: { sessionId: id, title } }]);
}

export function deleteSessionCmd(id: string, actor: string): void {
  emit([{ type: "session.deleted", actor, summary: "Chat archived (tombstone)", icon: "ph ph-archive", dot: "var(--color-neutral-500)", payload: { sessionId: id } }]);
}

export function addUserMessageCmd(sessionId: string, content: string, actor: string, modelName: string): string {
  const messageId = "m_" + randomUUID().slice(0, 10);
  emit([
    {
      type: "message.created",
      actor,
      summary: "Message routed to " + modelName,
      icon: "ph ph-paper-plane-tilt",
      dot: "var(--color-neutral-400)",
      payload: { messageId, sessionId, role: "user", content, model: null },
    },
  ]);
  return messageId;
}

export function addAssistantMessageCmd(args: {
  sessionId: string;
  content: string;
  model: string;
  modelName: string;
  dot: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  icon?: string;
  summary?: string;
  approval?: string;
}): string {
  const messageId = "m_" + randomUUID().slice(0, 10);
  emit([
    {
      type: "message.created",
      actor: args.modelName,
      summary: args.summary ?? args.modelName + " replied · " + args.outputTokens + " tok",
      icon: args.icon ?? "ph ph-sparkle",
      dot: args.dot,
      cost: args.cost,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      approval: args.approval ?? "N/A",
      payload: { messageId, sessionId: args.sessionId, role: "assistant", content: args.content, model: args.model },
    },
  ]);
  return messageId;
}
