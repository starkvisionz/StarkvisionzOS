// Real, Claude-powered "Lab" features: the multi-agent loop and the Nightshift
// brief. Both call the Anthropic API for real and log a domain event when done.

import { anthropic, costFor, hasApiKey, modelById } from "./anthropic.ts";
import { latestExchange, logBlindspots, logBranches, logConverged, logCounterfactual, logGraphTrace, logNightshift, logRecovery, logReplay, logTruth, memoryGraph, recentEvents } from "./db.ts";

type Send = (event: string, data: unknown) => void;

interface CallResult {
  text: string;
  inTok: number;
  outTok: number;
}

async function claudeText(model: string, system: string, prompt: string, maxTokens: number): Promise<CallResult> {
  const res = await anthropic().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { text, inTok: res.usage?.input_tokens ?? 0, outTok: res.usage?.output_tokens ?? 0 };
}

function extractJson(text: string): unknown {
  // tolerate prose around the JSON
  const obj = text.match(/\{[\s\S]*\}/);
  const arr = text.match(/\[[\s\S]*\]/);
  const candidate = arr && (!obj || arr.index! < obj.index!) ? arr[0] : obj ? obj[0] : null;
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

const AUTHOR_MODEL = "claude-opus-5";
const REVIEWER_MODEL = "claude-haiku-4-5";
const LENSES = [
  { key: "correctness", system: "You are a rigorous technical reviewer. Judge ONLY the correctness and soundness of the draft answer to the task." },
  { key: "completeness", system: "You are a thorough reviewer. Judge whether the draft fully addresses the task and name the single biggest gap." },
];

export async function runLoop(send: Send, task: string, target = 90, maxRounds = 4): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to run a real multi-agent loop." });
    return;
  }
  let cost = 0;
  const critiques: string[] = [];
  let best = 0;
  let converged = false;

  for (let n = 1; n <= maxRounds; n++) {
    const authorPrompt =
      `Task:\n${task}\n\n` +
      (critiques.length ? `Reviewer notes from the previous round to address:\n- ${critiques.join("\n- ")}\n\n` : "") +
      `Write the best possible answer. Be concrete and concise (a few short paragraphs or a tight list).`;
    const draft = await claudeText(AUTHOR_MODEL, "You are an expert author. Produce a strong, concrete answer; if reviewer notes are given, revise to address them.", authorPrompt, 1200);
    cost += costFor(AUTHOR_MODEL, draft.inTok, draft.outTok);

    const reviews: { name: string; score: number; note: string }[] = [];
    critiques.length = 0;
    for (const lens of LENSES) {
      const rp = `Task:\n${task}\n\nDraft answer:\n${draft.text}\n\nRespond with ONLY JSON: {"score": <integer 0-100>, "note": "<one concise sentence of critique or approval>"}.`;
      const r = await claudeText(REVIEWER_MODEL, lens.system + " Respond only with the requested JSON.", rp, 300);
      cost += costFor(REVIEWER_MODEL, r.inTok, r.outTok);
      const parsed = extractJson(r.text) as { score?: number; note?: string } | null;
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed?.score ?? 70))));
      const note = (parsed?.note || r.text.slice(0, 160)).trim();
      reviews.push({ name: lens.key, score, note });
      if (score < target) critiques.push(`(${lens.key}) ${note}`);
    }

    const roundScore = Math.min(...reviews.map((r) => r.score));
    best = roundScore;
    const done = roundScore >= target || n === maxRounds;
    converged = roundScore >= target;
    send("round", { n, draft: draft.text, reviews, score: roundScore, done, converged });
    if (done) break;
  }

  logConverged("hub", `Multi-agent loop finished at score ${best}` + (converged ? " (converged)" : " (max rounds)"));
  send("done", { best, converged, cost });
}

export async function runNightshift(send: Send): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to generate a real Nightshift brief." });
    return;
  }
  const events = recentEvents(40);
  const log = events.length ? events.map((e) => `- ${e.type}: ${e.summary}`).join("\n") : "(no activity recorded yet)";
  const prompt =
    `You are the overnight shift of an AI workspace. Here is the recent activity log:\n\n${log}\n\n` +
    `Produce a short "morning brief" of 2-4 findings the operator should see when they return. ` +
    `Base it on the log above; if the log is sparse, note that plainly. ` +
    `Return ONLY JSON: an array of objects {"kind": "answered"|"pruned"|"drafted"|"watch", "title": "<short>", "body": "<1-2 sentences>"}.`;
  const r = await claudeText(AUTHOR_MODEL, "You write concise, useful operational briefs. Respond only with the requested JSON.", prompt, 900);
  const cost = costFor(AUTHOR_MODEL, r.inTok, r.outTok);
  const parsed = extractJson(r.text);
  const findings = Array.isArray(parsed)
    ? parsed
        .filter((f) => f && typeof f === "object")
        .map((f) => {
          const o = f as Record<string, unknown>;
          const kind = String(o.kind || "watch");
          return {
            kind: ["answered", "pruned", "drafted", "watch"].includes(kind) ? kind : "watch",
            title: String(o.title || "Finding"),
            body: String(o.body || ""),
          };
        })
        .slice(0, 4)
    : [{ kind: "watch", title: "Brief unavailable", body: "The model did not return a parseable brief. Try again." }];

  logNightshift("hub", `Nightshift filed a brief — ${findings.length} finding(s)`);
  send("brief", { findings, cost });
}

/** Pick a sensible alternate model to replay through — a different, current
 *  model than the one that produced the original answer. */
function alternateModel(originalId: string): string {
  if (originalId !== "claude-opus-5") return "claude-opus-5";
  return "claude-sonnet-5";
}

export async function runReplay(send: Send, requestedModel?: string): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to replay a past turn through another model." });
    return;
  }
  const ex = latestExchange();
  if (!ex) {
    send("error", { message: "No completed chat turn to replay yet. Send a message in Chat first, then replay it here." });
    return;
  }
  const origModelId = ex.original.model || "claude-opus-5";
  const origMeta = modelById(origModelId);
  const origCost = ex.original.cost || 0;

  const replayModelId = modelById(requestedModel || alternateModel(origModelId)).id;
  const replayMeta = modelById(replayModelId);

  // Tell the client what the original was before we spend anything.
  send("original", {
    prompt: ex.prompt,
    content: ex.original.content,
    model: origModelId,
    modelName: origMeta.name,
    dot: origMeta.dot,
    cost: origCost,
    createdAt: ex.original.created_at,
  });
  send("replayStart", { model: replayModelId, modelName: replayMeta.name, dot: replayMeta.dot });

  // Re-run the same prompt through the alternate model, streaming the answer.
  let acc = "";
  const stream = anthropic().messages.stream({
    model: replayModelId,
    max_tokens: 1200,
    system:
      "You are Claude, an agent operating inside Starkvisionz OS. Answer the user's request directly and concisely. " +
      "Format replies in GitHub-flavored markdown. Do not include internal or system XML tags in your response.",
    messages: [{ role: "user", content: ex.prompt }],
  });
  stream.on("text", (delta) => {
    acc += delta;
    send("token", { text: delta });
  });
  const final = await stream.finalMessage();
  const inTok = final.usage?.input_tokens ?? 0;
  const outTok = final.usage?.output_tokens ?? 0;
  let cost = costFor(replayModelId, inTok, outTok);

  // Ask a cheap model to diff the two answers into a few concrete bullets.
  const diffPrompt =
    `Prompt:\n${ex.prompt}\n\nORIGINAL answer (${origMeta.name}):\n${ex.original.content}\n\n` +
    `REPLAYED answer (${replayMeta.name}):\n${acc}\n\n` +
    `List 2-4 concrete, specific ways the replayed answer differs from the original. ` +
    `Return ONLY JSON: an array of {"kind": "add"|"change"|"drop", "text": "<short phrase>"}.`;
  const d = await claudeText(
    "claude-haiku-4-5",
    "You compare two answers and report only the material differences. Respond only with the requested JSON.",
    diffPrompt,
    400,
  );
  cost += costFor("claude-haiku-4-5", d.inTok, d.outTok);
  const parsedDiffs = extractJson(d.text);
  const diffs = Array.isArray(parsedDiffs)
    ? parsedDiffs
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const o = x as Record<string, unknown>;
          const kind = String(o.kind || "change");
          return { kind: ["add", "change", "drop"].includes(kind) ? kind : "change", text: String(o.text || "") };
        })
        .filter((x) => x.text)
        .slice(0, 4)
    : [];

  logReplay("hub", `Replayed a turn through ${replayMeta.name} (was ${origMeta.name})`, cost);
  send("done", {
    model: replayModelId,
    modelName: replayMeta.name,
    dot: replayMeta.dot,
    content: acc,
    cost,
    origCost,
    diffs,
  });
}

// ── agent branches: fork one decision into parallel, independent explorations ──
const BRANCH_PERSONAS = [
  {
    key: "pragmatic",
    label: "Pragmatic",
    icon: "ph ph-hammer",
    dot: "var(--color-accent)",
    system: "You are a pragmatic staff engineer. Favor proven, boring technology and the fastest path to a shippable result. Optimize for time-to-ship and low operational surprise.",
  },
  {
    key: "robust",
    label: "Robust",
    icon: "ph ph-shield-check",
    dot: "#c9a27f",
    system: "You are a reliability-minded architect. Favor correctness, scalability, and long-term maintainability even at some extra upfront effort. Optimize for durability under load and change.",
  },
  {
    key: "lean",
    label: "Lean",
    icon: "ph ph-feather",
    dot: "#7fbfa8",
    system: "You are a minimalist engineer. Favor the smallest, cheapest solution that could possibly work. Optimize for low cost and low complexity, cutting anything non-essential.",
  },
];

export async function runBranches(send: Send, task: string): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to fork real agent branches." });
    return;
  }
  const model = "claude-opus-5";
  let cost = 0;
  const letters = ["A", "B", "C"];

  const branches: {
    id: string;
    letter: string;
    persona: string;
    personaIcon: string;
    personaDot: string;
    title: string;
    summary: string;
    effort: string;
    risk: string;
    cost: number;
  }[] = [];

  for (let i = 0; i < BRANCH_PERSONAS.length; i++) {
    const p = BRANCH_PERSONAS[i];
    const prompt =
      `Decision to make:\n${task}\n\n` +
      `Propose ONE concrete approach that reflects your priorities. ` +
      `Return ONLY JSON: {"title": "<=6 words naming the approach", "summary": "1-2 sentences on the approach and its main tradeoff", "effort": "S"|"M"|"L", "risk": "Low"|"Medium"|"High"}.`;
    const r = await claudeText(model, p.system + " Respond only with the requested JSON.", prompt, 400);
    cost += costFor(model, r.inTok, r.outTok);
    const parsed = (extractJson(r.text) || {}) as Record<string, unknown>;
    const effort = String(parsed.effort || "M").toUpperCase();
    const risk = String(parsed.risk || "Medium");
    branches.push({
      id: p.key,
      letter: letters[i] || String(i + 1),
      persona: p.label,
      personaIcon: p.icon,
      personaDot: p.dot,
      title: String(parsed.title || `${p.label} approach`).slice(0, 60),
      summary: String(parsed.summary || r.text.slice(0, 160)).trim(),
      effort: ["S", "M", "L"].includes(effort) ? effort : "M",
      risk: ["Low", "Medium", "High"].includes(risk) ? risk : "Medium",
      cost: costFor(model, r.inTok, r.outTok),
    });
  }

  // A judge picks the single best branch for this decision.
  let recommended = branches[0]?.id || "";
  let rationale = "";
  const judgePrompt =
    `Decision:\n${task}\n\nCandidate approaches:\n` +
    branches.map((b) => `- [${b.id}] ${b.title} (effort ${b.effort}, risk ${b.risk}): ${b.summary}`).join("\n") +
    `\n\nPick the single best approach overall. Return ONLY JSON: {"best": "<one of the bracketed ids>", "reason": "<one short sentence>"}.`;
  const j = await claudeText("claude-haiku-4-5", "You are a decisive technical judge. Respond only with the requested JSON.", judgePrompt, 200);
  cost += costFor("claude-haiku-4-5", j.inTok, j.outTok);
  const judged = extractJson(j.text) as { best?: string; reason?: string } | null;
  if (judged?.best && branches.some((b) => b.id === judged.best)) recommended = judged.best;
  rationale = (judged?.reason || "").trim();

  logBranches("hub", `Forked ${branches.length} agent branches for a decision`, cost);
  send("branches", { branches: branches.map((b) => ({ ...b, recommended: b.id === recommended })), recommended, rationale, cost });
}

// ── blind spot map: have Claude surface gaps + unverified assumptions from the log ──
export async function runBlindspots(send: Send): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to scan the event log for blind spots." });
    return;
  }
  const events = recentEvents(40);
  const log = events.length ? events.map((e) => `- ${e.type}: ${e.summary}`).join("\n") : "(no activity recorded yet)";
  const prompt =
    `You are auditing an AI workspace for blind spots — questions the system is quietly assuming an answer to, and gaps it keeps filling with guesses. Here is the recent activity log:\n\n${log}\n\n` +
    `Surface 3-5 blind spots. For each, name the open question, the area it touches, what is currently being assumed, what depends on it, and a severity 0-100. ` +
    `If the log is sparse, infer plausible blind spots for an event-sourced AI workspace and say so in the "assumed" text. ` +
    `Return ONLY JSON: an array of {"q": "<question>", "area": "<one short word: infra|policy|cost|data|scope|security>", "assumed": "<1-2 sentences>", "rides": "<what depends on it>", "sev": <integer 0-100>}.`;
  const r = await claudeText(AUTHOR_MODEL, "You are a rigorous auditor who names hidden assumptions precisely. Respond only with the requested JSON.", prompt, 900);
  const cost = costFor(AUTHOR_MODEL, r.inTok, r.outTok);
  const parsed = extractJson(r.text);
  const spots = Array.isArray(parsed)
    ? parsed
        .filter((x) => x && typeof x === "object")
        .map((x, i) => {
          const o = x as Record<string, unknown>;
          const sev = Math.max(0, Math.min(100, Math.round(Number(o.sev ?? 50))));
          return {
            id: "bs" + (i + 1),
            q: String(o.q || "Unnamed blind spot"),
            area: String(o.area || "scope").toLowerCase().slice(0, 12),
            assumed: String(o.assumed || ""),
            rides: String(o.rides || "unknown"),
            sev,
          };
        })
        .slice(0, 5)
    : [];

  logBlindspots("hub", `Scanned the event log — ${spots.length} blind spot(s) surfaced`, cost);
  send("spots", { spots, cost });
}

// ── counterfactual: project the alternate outcome of a decision ──
export async function runCounterfactual(send: Send, decision: string, alternative: string): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to run a real counterfactual." });
    return;
  }
  const prompt =
    `A team CHOSE this option:\n${decision}\n\nThe road not taken (the ALTERNATIVE) was:\n${alternative}\n\n` +
    `Project the alternate outcome as change-impact analysis. Pick 3-4 metrics that matter for this kind of decision. ` +
    `For each metric give the chosen option's value and the alternative's value, a relative bar magnitude 0-100 for each (higher = more of that metric), a short signed delta label, and whether the CHOSEN option is better on that metric. ` +
    `Then give a one-paragraph verdict on whether the chosen option was the right call.\n\n` +
    `Return ONLY JSON: {"metrics":[{"k":"<metric>","base":"<chosen value>","alt":"<alternative value>","baseW":<0-100>,"altW":<0-100>,"delta":"<short signed label>","good":<true if chosen is better>}],"verdict":"<one paragraph>"}.`;
  const r = await claudeText(
    AUTHOR_MODEL,
    "You are a decision analyst who projects concrete, quantified outcomes. Be realistic and specific. Respond only with the requested JSON.",
    prompt,
    1000,
  );
  const cost = costFor(AUTHOR_MODEL, r.inTok, r.outTok);
  const parsed = (extractJson(r.text) || {}) as Record<string, unknown>;
  const rawMetrics = Array.isArray(parsed.metrics) ? (parsed.metrics as Record<string, unknown>[]) : [];
  const clampW = (n: unknown) => Math.max(2, Math.min(100, Math.round(Number(n) || 0)));
  const metrics = rawMetrics
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      k: String(m.k || "Metric"),
      base: String(m.base ?? "—"),
      alt: String(m.alt ?? "—"),
      baseW: clampW(m.baseW),
      altW: clampW(m.altW),
      delta: String(m.delta ?? ""),
      good: !!m.good,
    }))
    .slice(0, 5);
  const verdict = String(parsed.verdict || r.text.slice(0, 240)).trim();

  logCounterfactual("hub", `Projected a counterfactual across ${metrics.length} metric(s)`, cost);
  send("done", { metrics, verdict, cost });
}

// ── truth decay: extract the claims the workspace relies on + re-verify them ──
export async function runTruthScan(send: Send): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to extract and score claims." });
    return;
  }
  const events = recentEvents(40);
  const log = events.length ? events.map((e) => `- ${e.type}: ${e.summary}`).join("\n") : "(no activity recorded yet)";
  const prompt =
    `An AI workspace relies on factual claims that quietly age. From the recent activity log, surface 3-5 concrete claims the system is currently treating as true.\n\n${log}\n\n` +
    `For each claim give the statement, a plausible source, a current confidence 0-100, and a confidence half-life (how fast it should decay, e.g. "14d", "30d", "90d"). ` +
    `If the log is sparse, infer plausible claims for an event-sourced AI workspace and say so implicitly in the source. ` +
    `Return ONLY JSON: an array of {"text":"<claim>","source":"<where it came from>","conf":<0-100>,"half":"<Nd>"}.`;
  const r = await claudeText(AUTHOR_MODEL, "You surface load-bearing factual assumptions precisely. Respond only with the requested JSON.", prompt, 900);
  const cost = costFor(AUTHOR_MODEL, r.inTok, r.outTok);
  const parsed = extractJson(r.text);
  const claims = Array.isArray(parsed)
    ? parsed
        .filter((x) => x && typeof x === "object")
        .map((x, i) => {
          const o = x as Record<string, unknown>;
          return {
            id: "cl" + (i + 1),
            text: String(o.text || "Unnamed claim"),
            source: String(o.source || "unknown source"),
            conf: Math.max(0, Math.min(100, Math.round(Number(o.conf ?? 60)))),
            half: String(o.half || "30d"),
          };
        })
        .slice(0, 5)
    : [];

  logTruth("hub", `Extracted ${claims.length} load-bearing claim(s) from the log`, cost);
  send("claims", { claims, cost });
}

/** Re-assess one claim's confidence. Returns 0-100 + a one-line note + cost. */
export async function reverifyClaim(text: string): Promise<{ conf: number; note: string; cost: number }> {
  const events = recentEvents(40);
  const log = events.length ? events.map((e) => `- ${e.type}: ${e.summary}`).join("\n") : "(no activity recorded yet)";
  const prompt =
    `Re-assess how confident we should be, right now, in this claim about an AI workspace:\n\n"${text}"\n\n` +
    `Recent activity log for context:\n${log}\n\n` +
    `Return ONLY JSON: {"conf": <integer 0-100>, "note": "<one short sentence>"}.`;
  const r = await claudeText("claude-haiku-4-5", "You are a careful fact-checker. Respond only with the requested JSON.", prompt, 200);
  const cost = costFor("claude-haiku-4-5", r.inTok, r.outTok);
  const parsed = (extractJson(r.text) || {}) as Record<string, unknown>;
  const conf = Math.max(0, Math.min(100, Math.round(Number(parsed.conf ?? 60))));
  return { conf, note: String(parsed.note || "").trim(), cost };
}

/** Trace a "why does X exist?" question through the real memory graph. Claude is
 *  given the actual nodes and edges built from the event log and must answer by
 *  walking that chain — returning the ordered path plus a grounded explanation.
 *  Logged as a `graph.traced` event. */
export async function runGraphTrace(send: Send, question: string): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to trace the memory graph." });
    return;
  }
  const g = memoryGraph(20);
  if (!g.nodes.length) {
    send("error", { message: "The memory graph is empty — chat or run a Lab tool and the graph builds itself from the event log." });
    return;
  }
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const nodesDesc = g.nodes.map((n) => `[${n.type}] ${n.label} — ${n.summary}`).join("\n");
  const edgesDesc = g.edges.map((e) => `${byId.get(e.from)?.label ?? e.from} --${e.label}--> ${byId.get(e.to)?.label ?? e.to}`).join("\n");
  const prompt =
    `A memory graph built from an AI workspace's real event log.\n\nNodes:\n${nodesDesc}\n\nEdges:\n${edgesDesc}\n\n` +
    `Question: "${question}"\n\n` +
    `Answer by walking the graph. Use ONLY the nodes and edges above; if they do not support an answer, say so plainly. ` +
    `Return ONLY JSON: {"title":"<the question, restated as a short title>","answer":"<2-3 sentences grounded in the nodes/edges>","path":[{"label":"<node label>","type":"<node type>"}]} ` +
    `where path is the ordered chain of 2-5 nodes that leads to the answer.`;
  const r = await claudeText(AUTHOR_MODEL, "You trace provenance through a graph precisely, using only the given nodes and edges. Respond only with the requested JSON.", prompt, 700);
  const cost = costFor(AUTHOR_MODEL, r.inTok, r.outTok);
  const parsed = (extractJson(r.text) || {}) as Record<string, unknown>;
  const path = Array.isArray(parsed.path)
    ? parsed.path
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const o = x as Record<string, unknown>;
          return { label: String(o.label || "node"), type: String(o.type || "event") };
        })
        .slice(0, 6)
    : [];
  const title = String(parsed.title || question).trim();
  const answer = String(parsed.answer || r.text.slice(0, 400)).trim();
  const hops = `${path.length} node(s) · ${g.edges.length} edges`;

  logGraphTrace("hub", `Traced the memory graph: ${question.slice(0, 80)}`, cost);
  send("trace", { title, answer, path, hops, cost });
}

const RECOVERY_STAGES = ["capture", "diagnose", "fix", "approve", "redeploy", "verify"] as const;

/** Closed-loop incident recovery. Instead of an agent editing config until the
 *  error changes, Claude runs a disciplined recovery: capture the last good
 *  state, diagnose the root cause, propose an isolated fix, gate on approval,
 *  redeploy, and verify — returning the ordered steps and a resolution. This is
 *  a real diagnosis of the described failure (no live deploy is performed).
 *  Logged as a `recovery.ran` event. */
export async function runRecovery(send: Send, incident: string): Promise<void> {
  if (!hasApiKey()) {
    send("error", { message: "No Anthropic API key configured — set ANTHROPIC_API_KEY to run a real recovery." });
    return;
  }
  const prompt =
    `A deployment/runtime failure needs a disciplined, closed-loop recovery — not trial-and-error edits.\n\nIncident:\n${incident}\n\n` +
    `Work the recovery in exactly these ordered stages: ${RECOVERY_STAGES.join(", ")} ` +
    `(capture the last good state, diagnose the root cause, propose an isolated fix tested in a sandbox, gate on human approval, redeploy, verify production health). ` +
    `For each stage give a concrete label and a one-line detail grounded in the incident. Then decide whether the recovery resolves it.\n\n` +
    `Return ONLY JSON: {"steps":[{"stage":"<one of the stages>","label":"<short>","detail":"<one line>"}],"resolved":<true|false>,"summary":"<one sentence outcome>"}.`;
  const r = await claudeText(AUTHOR_MODEL, "You are a rigorous site-reliability engineer running a closed-loop recovery. Respond only with the requested JSON.", prompt, 900);
  const cost = costFor(AUTHOR_MODEL, r.inTok, r.outTok);
  const parsed = (extractJson(r.text) || {}) as Record<string, unknown>;
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps = rawSteps
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const o = x as Record<string, unknown>;
      const stage = String(o.stage || "").toLowerCase();
      return {
        stage: (RECOVERY_STAGES as readonly string[]).includes(stage) ? stage : "diagnose",
        label: String(o.label || "Recovery step"),
        detail: String(o.detail || ""),
      };
    })
    .slice(0, 8);
  const resolved = parsed.resolved !== false;
  const summary = String(parsed.summary || (resolved ? "Recovered and verified." : "Could not fully resolve — needs a human.")).trim();

  logRecovery("hub", `Ran a closed-loop recovery: ${incident.slice(0, 80)}`, cost);
  send("recovery", { steps, resolved, summary, cost });
}
