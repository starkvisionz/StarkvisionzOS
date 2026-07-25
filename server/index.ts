import express, { type Request, type Response } from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  addMessage,
  appendEvent,
  createSession,
  deleteSession,
  db,
  getSession,
  historyForModel,
  listMessages,
  listSessions,
  recentEvents,
  renameSession,
} from "./db.ts";
import { CHAT_SYSTEM, DEFAULT_MODEL, MODELS, anthropic, costFor, hasApiKey, modelById } from "./anthropic.ts";

const PORT = Number(process.env.PORT || 8787);
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

// ── meta ──
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, apiKey: hasApiKey(), model: DEFAULT_MODEL });
});

app.get("/api/models", (_req, res) => {
  res.json({
    models: MODELS.map((m) => ({ id: m.id, name: m.name, sub: m.sub, dot: m.dot })),
    default: DEFAULT_MODEL,
    apiKey: hasApiKey(),
  });
});

// ── sessions ──
app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.post("/api/sessions", (req, res) => {
  const model = typeof req.body?.model === "string" ? req.body.model : DEFAULT_MODEL;
  const s = createSession(modelById(model).id, "New chat");
  appendEvent({ type: "session.created", summary: "New chat started", actor: "Eric Stark", evidence: s.id, icon: "ph ph-chats-circle", dot: "var(--color-neutral-400)" });
  res.json({ session: s });
});

app.patch("/api/sessions/:id", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  if (typeof req.body?.title === "string") renameSession(s.id, req.body.title.slice(0, 80));
  res.json({ session: getSession(s.id) });
});

app.delete("/api/sessions/:id", (req, res) => {
  deleteSession(req.params.id);
  res.json({ ok: true });
});

app.get("/api/sessions/:id/messages", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  res.json({ session: s, messages: listMessages(s.id) });
});

// ── events + projections ──
app.get("/api/events", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 200);
  res.json({ events: recentEvents(limit) });
});

app.get("/api/projections/dashboard", (_req, res) => {
  const agg = db
    .prepare(
      `SELECT
         COALESCE(SUM(cost), 0) AS spend,
         COUNT(*) AS msgs,
         COALESCE(SUM(output_tokens + input_tokens), 0) AS tokens
       FROM messages`,
    )
    .get() as { spend: number; msgs: number; tokens: number };
  const sessionCount = (db.prepare(`SELECT COUNT(*) AS n FROM sessions`).get() as { n: number }).n;

  // spend per day, last 7 days (local dates)
  const days: { day: string; date: string; spend: number }[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ day: fmt.format(d), date: iso, spend: 0 });
  }
  const perDay = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS d, COALESCE(SUM(cost),0) AS c
       FROM messages GROUP BY d`,
    )
    .all() as { d: string; c: number }[];
  const byDate = new Map(perDay.map((r) => [r.d, r.c]));
  for (const day of days) day.spend = byDate.get(day.date) || 0;

  res.json({
    spend: agg.spend,
    messages: agg.msgs,
    tokens: agg.tokens,
    sessions: sessionCount,
    spendDays: days,
    apiKey: hasApiKey(),
  });
});

// ── chat (SSE streaming) ──
app.post("/api/chat", async (req: Request, res: Response) => {
  const sessionId: string = req.body?.sessionId;
  const content: string = (req.body?.content ?? "").toString();
  const requestedModel: string = req.body?.model || DEFAULT_MODEL;
  const session = sessionId ? getSession(sessionId) : undefined;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!session) {
    send("error", { message: "Session not found." });
    return res.end();
  }
  if (!content.trim()) {
    send("error", { message: "Empty message." });
    return res.end();
  }

  const model = modelById(requestedModel).id;

  // persist the user turn + emit events
  const isFirst = listMessages(session.id).filter((m) => m.role === "user").length === 0;
  addMessage({ session_id: session.id, role: "user", content, model: null, input_tokens: 0, output_tokens: 0, cost: 0 });
  if (isFirst) renameSession(session.id, content.slice(0, 42));
  appendEvent({ type: "session.message", summary: "Message routed to " + modelById(model).name, actor: "Eric Stark", evidence: session.id, icon: "ph ph-paper-plane-tilt", dot: "var(--color-neutral-400)" });

  if (!hasApiKey()) {
    const msg =
      "The backend is running, but no Anthropic API key is configured, so I can't generate a real reply yet. " +
      "Set ANTHROPIC_API_KEY in the server environment (see .env.example) and restart — then this chat streams real Claude responses.";
    send("token", { text: msg });
    const saved = addMessage({ session_id: session.id, role: "assistant", content: msg, model, input_tokens: 0, output_tokens: 0, cost: 0 });
    appendEvent({ type: "agent.reply", summary: "Reply blocked — no API key configured", actor: modelById(model).name, evidence: saved.id, icon: "ph ph-warning", dot: "#d68f9a" });
    send("done", { messageId: saved.id, cost: 0, tokens: 0, model, needsKey: true });
    return res.end();
  }

  const messages = historyForModel(session.id);
  let acc = "";
  let aborted = false;

  try {
    const stream = anthropic().messages.stream({
      model,
      max_tokens: 16000,
      system: CHAT_SYSTEM,
      messages,
    });

    req.on("close", () => {
      aborted = true;
      stream.abort();
    });

    stream.on("text", (delta) => {
      acc += delta;
      send("token", { text: delta });
    });

    const final = await stream.finalMessage();
    const inTok = final.usage?.input_tokens ?? 0;
    const outTok = final.usage?.output_tokens ?? 0;
    const cost = costFor(model, inTok, outTok);

    const saved = addMessage({
      session_id: session.id,
      role: "assistant",
      content: acc,
      model,
      input_tokens: inTok,
      output_tokens: outTok,
      cost,
    });
    appendEvent({ type: "agent.reply", summary: modelById(model).name + " replied · " + outTok + " tok", actor: modelById(model).name, evidence: saved.id, icon: "ph ph-sparkle", dot: modelById(model).dot, cost });
    appendEvent({ type: "cost.recorded", summary: "Turn cost $" + cost.toFixed(4) + " · " + (inTok + outTok) + " tok", actor: "hub", evidence: saved.id, icon: "ph ph-coins", dot: "var(--color-neutral-400)", cost });
    send("done", { messageId: saved.id, cost, tokens: inTok + outTok, model });
    res.end();
  } catch (err) {
    if (aborted) return res.end();
    const message = err instanceof Error ? err.message : "Unknown error calling the model.";
    // persist whatever streamed, plus the error, so the event log stays honest
    if (acc) addMessage({ session_id: session.id, role: "assistant", content: acc, model, input_tokens: 0, output_tokens: 0, cost: 0 });
    appendEvent({ type: "agent.error", summary: "Model call failed: " + message.slice(0, 80), actor: modelById(model).name, evidence: session.id, icon: "ph ph-warning-octagon", dot: "#d68f9a" });
    send("error", { message });
    res.end();
  }
});

// ── serve the built frontend in production, if present ──
const dist = resolve(process.cwd(), "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

app.listen(PORT, () => {
  const key = hasApiKey() ? "configured" : "MISSING (set ANTHROPIC_API_KEY)";
  console.log(`[svos] api on http://localhost:${PORT} · Anthropic key: ${key} · time ${nowTime()}`);
});
