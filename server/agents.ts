// Real, Claude-powered "Lab" features: the multi-agent loop and the Nightshift
// brief. Both call the Anthropic API for real and log a domain event when done.

import { anthropic, costFor, hasApiKey, modelById } from "./anthropic.ts";
import { latestExchange, logConverged, logNightshift, logReplay, recentEvents } from "./db.ts";

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
