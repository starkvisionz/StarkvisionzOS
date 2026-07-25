// Proves the event-sourcing invariants:
//   1. The projection (sessions + messages) is fully derived from the event log
//      — wiping and replaying reconstructs it identically.
//   2. Deleting a conversation is a tombstone: its spend/tokens survive in the
//      dashboard, which is computed from immutable events.
//
// Run with: npm run verify:events

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const dir = mkdtempSync(join(tmpdir(), "svos-verify-"));
process.env.SVOS_DB_PATH = join(dir, "test.db");

const db = await import("./db.ts");

function snapshot() {
  return {
    sessions: db.listSessions(),
    dash: db.dashboardFromEvents(),
    messages: db
      .listSessions()
      .flatMap((s) => db.listMessages(s.id))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

try {
  // build some history
  const a = db.createSessionCmd("claude-opus-5", "operator", "New chat");
  db.addUserMessageCmd(a.id, "Hello there", "operator", "Claude Opus");
  db.addAssistantMessageCmd({ sessionId: a.id, content: "Hi!", model: "claude-opus-5", modelName: "Claude Opus", dot: "x", inputTokens: 10, outputTokens: 6, cost: 0.0002 });

  const b = db.createSessionCmd("claude-sonnet-5", "operator", "New chat");
  db.addUserMessageCmd(b.id, "Second convo", "operator", "Claude Sonnet");
  db.addAssistantMessageCmd({ sessionId: b.id, content: "ok", model: "claude-sonnet-5", modelName: "Claude Sonnet", dot: "x", inputTokens: 20, outputTokens: 8, cost: 0.0009 });

  const spendBeforeDelete = db.dashboardFromEvents().spend;
  assert.ok(spendBeforeDelete > 0, "expected non-zero spend");

  // delete session b — a tombstone; its spend must remain in the dashboard
  db.deleteSessionCmd(b.id, "operator");
  const dashAfterDelete = db.dashboardFromEvents();
  assert.equal(dashAfterDelete.spend, spendBeforeDelete, "spend must survive deletion (tombstone, event-sourced analytics)");
  assert.equal(db.listSessions().length, 1, "deleted session must not appear in the active list");
  assert.equal(dashAfterDelete.messages, 4, "message count must count immutable events, not deletable rows");

  // projection replay: wipe projection tables and rebuild purely from events
  const before = snapshot();
  db.rebuildProjections();
  const after = snapshot();
  assert.deepEqual(after.sessions, before.sessions, "sessions projection must rebuild identically");
  assert.deepEqual(after.messages, before.messages, "messages projection must rebuild identically");
  assert.deepEqual(after.dash, before.dash, "dashboard must rebuild identically");

  console.log("✓ event-sourcing verified: projection replays identically; deletes preserve analytics via tombstones");
  db.db.close();
  rmSync(dir, { recursive: true, force: true });
  process.exit(0);
} catch (err) {
  console.error("✗ event-sourcing verification FAILED");
  console.error(err);
  db.db.close();
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}
