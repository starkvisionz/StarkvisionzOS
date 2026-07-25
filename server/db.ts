// Event-sourced persistence for Starkvisionz OS.
//
// `events` is the append-only source of truth — every meaningful thing that
// happens (a message routed, an agent reply, a cost recorded, a session
// created) is written here and never mutated. `sessions` and `messages` are
// convenience projections for the chat surface; the analytics views are
// rebuilt from `events`.

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = process.env.SVOS_DB_PATH || resolve(process.cwd(), "server/data/svos.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    seq        INTEGER PRIMARY KEY AUTOINCREMENT,
    id         TEXT UNIQUE NOT NULL,
    stream_id  TEXT NOT NULL DEFAULT 'project',
    type       TEXT NOT NULL,
    actor      TEXT NOT NULL DEFAULT 'system',
    summary    TEXT NOT NULL DEFAULT '',
    evidence   TEXT NOT NULL DEFAULT '',
    icon       TEXT NOT NULL DEFAULT 'ph ph-circle',
    dot        TEXT NOT NULL DEFAULT 'var(--color-neutral-400)',
    cost       REAL NOT NULL DEFAULT 0,
    approval   TEXT NOT NULL DEFAULT 'N/A',
    payload    TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT 'New chat',
    model      TEXT NOT NULL,
    grp        TEXT NOT NULL DEFAULT 'Today',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role          TEXT NOT NULL,
    content       TEXT NOT NULL DEFAULT '',
    model         TEXT,
    input_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost          REAL NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_seq ON events(seq DESC);
`);

export interface EventInput {
  type: string;
  summary: string;
  actor?: string;
  evidence?: string;
  icon?: string;
  dot?: string;
  cost?: number;
  approval?: string;
  streamId?: string;
  payload?: Record<string, unknown>;
}

export interface EventRow {
  id: string;
  stream_id: string;
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

const insertEvent = db.prepare(`
  INSERT INTO events (id, stream_id, type, actor, summary, evidence, icon, dot, cost, approval, payload, created_at)
  VALUES (@id, @stream_id, @type, @actor, @summary, @evidence, @icon, @dot, @cost, @approval, @payload, @created_at)
`);

export function appendEvent(e: EventInput): EventRow {
  const row = {
    id: "evt_" + randomUUID().replace(/-/g, "").slice(0, 20),
    stream_id: e.streamId ?? "project",
    type: e.type,
    actor: e.actor ?? "system",
    summary: e.summary,
    evidence: e.evidence ?? "",
    icon: e.icon ?? "ph ph-circle",
    dot: e.dot ?? "var(--color-neutral-400)",
    cost: e.cost ?? 0,
    approval: e.approval ?? "N/A",
    payload: JSON.stringify(e.payload ?? {}),
    created_at: new Date().toISOString(),
  };
  insertEvent.run(row);
  return row;
}

export function recentEvents(limit = 40): EventRow[] {
  return db
    .prepare(
      `SELECT id, stream_id, type, actor, summary, evidence, icon, dot, cost, approval, created_at
       FROM events ORDER BY seq DESC LIMIT ?`,
    )
    .all(limit) as EventRow[];
}

// ── sessions ──
export interface SessionRow {
  id: string;
  title: string;
  model: string;
  grp: string;
  created_at: string;
  updated_at: string;
}

export function createSession(model: string, title = "New chat"): SessionRow {
  const now = new Date().toISOString();
  const row: SessionRow = { id: "s_" + randomUUID().slice(0, 8), title, model, grp: "Today", created_at: now, updated_at: now };
  db.prepare(
    `INSERT INTO sessions (id, title, model, grp, created_at, updated_at)
     VALUES (@id, @title, @model, @grp, @created_at, @updated_at)`,
  ).run(row);
  return row;
}

export function listSessions(): SessionRow[] {
  return db.prepare(`SELECT * FROM sessions ORDER BY updated_at DESC`).all() as SessionRow[];
}

export function getSession(id: string): SessionRow | undefined {
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionRow | undefined;
}

export function renameSession(id: string, title: string): void {
  db.prepare(`UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`).run(title, new Date().toISOString(), id);
}

export function touchSession(id: string): void {
  db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
}

export function deleteSession(id: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}

// ── messages ──
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

export function addMessage(m: Omit<MessageRow, "id" | "created_at"> & { id?: string }): MessageRow {
  const row: MessageRow = {
    id: m.id ?? "m_" + randomUUID().slice(0, 10),
    session_id: m.session_id,
    role: m.role,
    content: m.content,
    model: m.model,
    input_tokens: m.input_tokens,
    output_tokens: m.output_tokens,
    cost: m.cost,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO messages (id, session_id, role, content, model, input_tokens, output_tokens, cost, created_at)
     VALUES (@id, @session_id, @role, @content, @model, @input_tokens, @output_tokens, @cost, @created_at)`,
  ).run(row);
  touchSession(m.session_id);
  return row;
}

export function listMessages(sessionId: string): MessageRow[] {
  return db
    .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC`)
    .all(sessionId) as MessageRow[];
}

export function historyForModel(sessionId: string): { role: "user" | "assistant"; content: string }[] {
  return listMessages(sessionId)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
}
