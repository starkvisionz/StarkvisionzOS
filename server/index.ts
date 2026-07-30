import express, { type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  addAssistantMessageCmd,
  addUserMessageCmd,
  createSessionCmd,
  dashboardFromEvents,
  deleteSessionCmd,
  getSession,
  getSettings,
  historyForModel,
  listMessages,
  listSessions,
  memoryGraph,
  modelLeaderboard,
  putSettingsCmd,
  rebuildProjections,
  recentEvents,
  renameSessionCmd,
} from "./db.ts";
import { DEFAULT_MODEL, MODELS, anthropic, costFor, hasApiKey, modelById } from "./anthropic.ts";
import { reverifyClaim, runBlindspots, runBranches, runCounterfactual, runGraphTrace, runLoop, runNightshift, runReplay, runTruthScan } from "./agents.ts";
import {
  ACTOR,
  AUTH_REQUIRED,
  CHAT_LIMIT,
  MAX_OUTPUT_TOKENS,
  MAX_PROMPT_CHARS,
  RATE_LIMIT,
  cors,
  rateLimit,
  requireAuth,
} from "./security.ts";

if (process.env.SVOS_REBUILD_ON_START === "1") rebuildProjections();

const PORT = Number(process.env.PORT || 8787);
const app = express();
app.disable("x-powered-by");
app.use(cors);
app.use(express.json({ limit: "2mb" }));

// ── public: health (also tells the client whether auth is required) ──
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, apiKey: hasApiKey(), model: DEFAULT_MODEL, authRequired: AUTH_REQUIRED });
});

// ── everything else under /api is authenticated + rate-limited ──
app.use("/api", requireAuth, rateLimit("api", RATE_LIMIT));

app.get("/api/models", (_req, res) => {
  res.json({
    models: MODELS.map((m) => ({ id: m.id, name: m.name, sub: m.sub, dot: m.dot })),
    default: DEFAULT_MODEL,
    apiKey: hasApiKey(),
  });
});

app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.post("/api/sessions", (req, res) => {
  const model = typeof req.body?.model === "string" ? req.body.model : DEFAULT_MODEL;
  const s = createSessionCmd(modelById(model).id, ACTOR);
  res.json({ session: s });
});

app.patch("/api/sessions/:id", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  if (typeof req.body?.title === "string") renameSessionCmd(s.id, req.body.title.slice(0, 80), ACTOR);
  res.json({ session: getSession(s.id) });
});

app.delete("/api/sessions/:id", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  deleteSessionCmd(s.id, ACTOR); // tombstone — history is preserved
  res.json({ ok: true });
});

app.get("/api/sessions/:id/messages", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  res.json({ session: s, messages: listMessages(s.id) });
});

app.get("/api/settings", (_req, res) => {
  res.json({ settings: getSettings() });
});

app.put("/api/settings", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const saved = putSettingsCmd(body, ACTOR);
  res.json({ settings: saved });
});

app.get("/api/events", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 200);
  res.json({ events: recentEvents(limit) });
});

app.get("/api/projections/dashboard", (_req, res) => {
  const d = dashboardFromEvents();
  res.json({ ...d, apiKey: hasApiKey() });
});

app.get("/api/projections/models", (_req, res) => {
  const rows = modelLeaderboard().map((r) => {
    const m = modelById(r.model);
    return { model: r.model, name: m.name, sub: m.sub, dot: m.dot, messages: r.messages, spend: r.spend, tokens: r.tokens };
  });
  res.json({ models: rows });
});

app.get("/api/projections/graph", (_req, res) => {
  res.json(memoryGraph());
});

// ── chat (SSE streaming) ──
app.post("/api/chat", rateLimit("chat", CHAT_LIMIT), async (req: Request, res: Response) => {
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
  if (content.length > MAX_PROMPT_CHARS) {
    send("error", { message: `Message too long (max ${MAX_PROMPT_CHARS} characters).` });
    return res.end();
  }

  const model = modelById(requestedModel).id;
  const md = modelById(model);

  // persist the user turn (event-first, transactional) + rename on first turn
  const isFirst = listMessages(session.id).filter((m) => m.role === "user").length === 0;
  addUserMessageCmd(session.id, content, ACTOR, md.name);
  if (isFirst) renameSessionCmd(session.id, content.slice(0, 42), ACTOR);

  if (!hasApiKey()) {
    const msg =
      "The backend is running, but no Anthropic API key is configured, so I can't generate a real reply yet. " +
      "Set ANTHROPIC_API_KEY in the server environment (see .env.example) and restart — then this chat streams real Claude responses.";
    send("token", { text: msg });
    const id = addAssistantMessageCmd({
      sessionId: session.id,
      content: msg,
      model,
      modelName: md.name,
      dot: "#d68f9a",
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      icon: "ph ph-warning",
      summary: "Reply blocked — no API key configured",
    });
    send("done", { messageId: id, cost: 0, tokens: 0, model, needsKey: true });
    return res.end();
  }

  const messages = historyForModel(session.id);
  const cfg = getSettings();
  const system =
    cfg.sysPrompt +
    (cfg.aboutText ? "\n\nAbout the user you're assisting:\n" + cfg.aboutText : "") +
    "\n\nFormat replies in GitHub-flavored markdown. Do not include internal or system XML tags in your response.";
  let acc = "";
  let aborted = false;

  try {
    const stream = anthropic().messages.stream({ model, max_tokens: MAX_OUTPUT_TOKENS, system, messages });
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
    const id = addAssistantMessageCmd({
      sessionId: session.id,
      content: acc,
      model,
      modelName: md.name,
      dot: md.dot,
      inputTokens: inTok,
      outputTokens: outTok,
      cost,
    });
    send("done", { messageId: id, cost, tokens: inTok + outTok, model });
    res.end();
  } catch (err) {
    if (aborted) return res.end();
    const message = err instanceof Error ? err.message : "Unknown error calling the model.";
    if (acc)
      addAssistantMessageCmd({
        sessionId: session.id,
        content: acc + "\n\n_(response interrupted by an error)_",
        model,
        modelName: md.name,
        dot: "#d68f9a",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        icon: "ph ph-warning-octagon",
        summary: "Model call failed mid-stream",
      });
    send("error", { message });
    res.end();
  }
});

// ── real multi-agent loop (SSE) ──
function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}

app.post("/api/loop/run", rateLimit("agents", CHAT_LIMIT), async (req: Request, res: Response) => {
  const task = (req.body?.task ?? "").toString().trim();
  const target = Math.max(50, Math.min(99, Number(req.body?.target) || 90));
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  if (!task) {
    send("error", { message: "Provide a task for the loop." });
    return res.end();
  }
  if (task.length > MAX_PROMPT_CHARS) {
    send("error", { message: `Task too long (max ${MAX_PROMPT_CHARS} characters).` });
    return res.end();
  }
  try {
    await runLoop(send, task, target);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Loop failed." });
  }
  res.end();
});

app.post("/api/nightshift/run", rateLimit("agents", CHAT_LIMIT), async (_req: Request, res: Response) => {
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  try {
    await runNightshift(send);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Nightshift failed." });
  }
  res.end();
});

app.post("/api/replay/run", rateLimit("agents", CHAT_LIMIT), async (req: Request, res: Response) => {
  const model = typeof req.body?.model === "string" ? req.body.model : undefined;
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  try {
    await runReplay(send, model);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Replay failed." });
  }
  res.end();
});

app.post("/api/branches/run", rateLimit("agents", CHAT_LIMIT), async (req: Request, res: Response) => {
  const task = (req.body?.task ?? "").toString().trim();
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  if (!task) {
    send("error", { message: "Provide a decision to fork into branches." });
    return res.end();
  }
  if (task.length > MAX_PROMPT_CHARS) {
    send("error", { message: `Decision too long (max ${MAX_PROMPT_CHARS} characters).` });
    return res.end();
  }
  try {
    await runBranches(send, task);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Branching failed." });
  }
  res.end();
});

app.post("/api/blindspots/run", rateLimit("agents", CHAT_LIMIT), async (_req: Request, res: Response) => {
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  try {
    await runBlindspots(send);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Blind-spot scan failed." });
  }
  res.end();
});

app.post("/api/counterfactual/run", rateLimit("agents", CHAT_LIMIT), async (req: Request, res: Response) => {
  const decision = (req.body?.decision ?? "").toString().trim();
  const alternative = (req.body?.alternative ?? "").toString().trim();
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  if (!decision || !alternative) {
    send("error", { message: "Provide both the chosen decision and the alternative to compare." });
    return res.end();
  }
  if (decision.length + alternative.length > MAX_PROMPT_CHARS) {
    send("error", { message: `Inputs too long (max ${MAX_PROMPT_CHARS} characters combined).` });
    return res.end();
  }
  try {
    await runCounterfactual(send, decision, alternative);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Counterfactual failed." });
  }
  res.end();
});

app.post("/api/truth/scan", rateLimit("agents", CHAT_LIMIT), async (_req: Request, res: Response) => {
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  try {
    await runTruthScan(send);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Claim scan failed." });
  }
  res.end();
});

app.post("/api/truth/reverify", rateLimit("agents", CHAT_LIMIT), async (req: Request, res: Response) => {
  const text = (req.body?.text ?? "").toString().trim();
  if (!text) return res.status(400).json({ error: "Provide the claim text to re-verify." });
  if (text.length > MAX_PROMPT_CHARS) return res.status(400).json({ error: "Claim too long." });
  if (!hasApiKey()) return res.status(503).json({ error: "No Anthropic API key configured." });
  try {
    const result = await reverifyClaim(text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Re-verify failed." });
  }
});

app.post("/api/graph/trace", rateLimit("agents", CHAT_LIMIT), async (req: Request, res: Response) => {
  const question = (req.body?.question ?? "").toString().trim();
  sseHeaders(res);
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  if (!question) {
    send("error", { message: "Ask the graph a question to trace." });
    return res.end();
  }
  if (question.length > MAX_PROMPT_CHARS) {
    send("error", { message: `Question too long (max ${MAX_PROMPT_CHARS} characters).` });
    return res.end();
  }
  try {
    await runGraphTrace(send, question);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Graph trace failed." });
  }
  res.end();
});

// ── serve the built frontend in production, if present ──
const dist = resolve(process.cwd(), "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

app.listen(PORT, () => {
  const key = hasApiKey() ? "configured" : "MISSING (set ANTHROPIC_API_KEY)";
  const auth = AUTH_REQUIRED ? "bearer token required" : "OPEN to loopback only (set SVOS_AUTH_TOKEN for remote)";
  console.log(`[svos] api on http://localhost:${PORT} · Anthropic key: ${key} · auth: ${auth}`);
});
