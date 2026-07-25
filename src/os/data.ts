// Static data + seed builders for Starkvisionz OS.
// Transcribed from the design prototype so the projections match exactly.

import type {
  LoopRoundSeed,
  Message,
  ModelDef,
  Project,
  TimelineEvent,
} from "./types";

export const MODELS: ModelDef[] = [
  { id: "gpt-desktop", name: "ChatGPT", sub: "Desktop · gpt-4o", dot: "#7fbfa8" },
  { id: "gpt-web", name: "ChatGPT", sub: "Web · gpt-4o", dot: "#8fb0d6" },
  { id: "hermes", name: "Hermes", sub: "Nous · Hermes-3-70B", dot: "var(--color-accent-400)" },
  { id: "forge", name: "Forge", sub: "Agent · claude-code", dot: "var(--color-accent)" },
  { id: "claude", name: "Claude", sub: "Sonnet 4.5", dot: "#c9a27f" },
];

const AGENT_ICONS: Record<string, string> = {
  "gpt-desktop": "ph ph-chat-circle-dots",
  "gpt-web": "ph ph-globe",
  hermes: "ph ph-infinity",
  forge: "ph ph-hammer",
  claude: "ph ph-sparkle",
};

export function agentMeta(id: string) {
  const m = MODELS.find((x) => x.id === id) || MODELS[0];
  return { name: m.name, sub: m.sub, icon: AGENT_ICONS[id] || "ph ph-robot", dot: m.dot };
}

export const PROJECTS: Project[] = [
  {
    id: "hub",
    name: "Starkvisionz OS",
    icon: "ph ph-hand-tap",
    color: "var(--color-accent)",
    meta: "event hub · 3 repos",
    repos: [
      { id: "hub-api", name: "svh/hub-api", branch: "main", meta: "event store, projections", state: "clean" },
      { id: "hub-web", name: "svh/hub-web", branch: "develop", meta: "this interface", state: "ahead" },
      { id: "hub-infra", name: "svh/hub-infra", branch: "main", meta: "Coolify, migrations", state: "dirty" },
    ],
  },
  {
    id: "ledger",
    name: "Ledger",
    icon: "ph ph-receipt",
    color: "#d6c07a",
    meta: "cost attribution · 2 repos",
    repos: [
      { id: "led-core", name: "svh/ledger-core", branch: "main", meta: "attribution engine", state: "clean" },
      { id: "led-export", name: "svh/ledger-export", branch: "main", meta: "warehouse sync", state: "clean" },
    ],
  },
  {
    id: "atlas",
    name: "Atlas",
    icon: "ph ph-compass",
    color: "#8fb7d6",
    meta: "archived · 1 repo",
    repos: [{ id: "atlas", name: "svh/atlas", branch: "main", meta: "archived Feb 2026", state: "clean" }],
  },
];

export const INITIAL_SESSIONS = [
  { id: "s1", title: "Build agent status dashboard", grp: "Today", dot: "var(--color-accent)" },
  { id: "s2", title: "Diagnose Coolify deploy 37 failure", grp: "Today", dot: "var(--color-neutral-500)" },
  { id: "s3", title: "Compare Postgres vs Mongo for events", grp: "Today", dot: "var(--color-neutral-500)" },
  { id: "s4", title: "Draft §1202 QSBS memo", grp: "Yesterday", dot: "var(--color-neutral-500)" },
  { id: "s5", title: "Hermes: summarize Notion PRD", grp: "Yesterday", dot: "var(--color-neutral-500)" },
];

export const INITIAL_EVENTS: TimelineEvent[] = [
  { id: "ev1", type: "deployment.succeeded", summary: "Deploy 38 healthy on Coolify staging", time: "21:41", actor: "agent_forge", evidence: "sha 52f1a20", icon: "ph ph-rocket-launch", dot: "var(--color-accent)" },
  { id: "ev2", type: "human.change_approved", summary: "Eric approved: restore DATABASE_URL", time: "21:39", actor: "Eric Stark", evidence: "decision dec_204", icon: "ph ph-shield-check", dot: "var(--color-accent-300)" },
  { id: "ev3", type: "agent.diagnosed_failure", summary: "DATABASE_URL dropped between deploy 36→37", time: "21:35", actor: "agent_forge", evidence: "test_2291", icon: "ph ph-magnifying-glass", dot: "var(--color-neutral-400)" },
  { id: "ev4", type: "deployment.failed", summary: "Deploy 37 failed — missing env reference", time: "21:22", actor: "coolify", evidence: "run r_1182", icon: "ph ph-warning", dot: "#d68f9a" },
  { id: "ev5", type: "agent.code_modified", summary: "Implemented agent status dashboard", time: "21:14", actor: "agent_forge", evidence: "sha 52f1a20", icon: "ph ph-code", dot: "var(--color-neutral-400)" },
  { id: "ev6", type: "requirement.discussed", summary: "Dashboard requirements captured from PRD", time: "20:58", actor: "ChatGPT", evidence: "ses_1842", icon: "ph ph-chat-circle-dots", dot: "var(--color-neutral-400)" },
];

export const EVENT_POOL: TimelineEvent[] = [
  { id: "", type: "agent.code_modified", summary: "Forge edited src/components/agent-card.tsx", actor: "agent_forge", evidence: "sha 8c31f0a", icon: "ph ph-code", dot: "var(--color-neutral-400)" },
  { id: "", type: "test.passed", summary: "12 tests passed on develop", actor: "ci", evidence: "test_2304", icon: "ph ph-check-circle", dot: "var(--color-accent)" },
  { id: "", type: "session.message", summary: "Hermes summarized the Notion PRD", actor: "Hermes", evidence: "ses_1903", icon: "ph ph-infinity", dot: "var(--color-accent-400)" },
  { id: "", type: "cost.recorded", summary: "Agent run logged: $0.42 · 14k tok", actor: "hub", evidence: "usage_552", icon: "ph ph-coins", dot: "var(--color-neutral-400)" },
  { id: "", type: "artifact.created", summary: "New version: architecture-decision-204.md v3", actor: "agent_forge", evidence: "art_204", icon: "ph ph-file-text", dot: "var(--color-neutral-400)" },
  { id: "", type: "approval.requested", summary: "Forge requests staging deploy", actor: "agent_forge", evidence: "wf_build", icon: "ph ph-shield-check", dot: "var(--color-accent-300)" },
  { id: "", type: "github.pr_opened", summary: "PR #43 opened: agent dashboard", actor: "agent_forge", evidence: "pr_43", icon: "ph ph-git-pull-request", dot: "var(--color-neutral-400)" },
];

export const INITIAL_SYS_PROMPT =
  "You are an agent operating inside Stark OS — an event-sourced AI workspace.\n\n- Read the shared project context before acting; never ask the human to re-explain the project.\n- Every action you take is logged as an immutable event. Cite evidence (commits, test runs, decisions).\n- Break work into tasks and estimate cost per step.\n- Any action that touches production requires explicit human approval first.";

export const INITIAL_ABOUT =
  "Eric Stark — project-controls background (WBS, earned value, variance). Prefers concise, decisive answers with the cost and the tradeoff stated up front.";

export const INITIAL_MCP = [
  { id: "github", name: "GitHub", transport: "http · OAuth", tools: 12, connected: true, icon: "ph ph-github-logo" },
  { id: "coolify", name: "Coolify", transport: "SSE", tools: 6, connected: true, icon: "ph ph-rocket-launch" },
  { id: "notion", name: "Notion", transport: "http · OAuth", tools: 8, connected: true, icon: "ph ph-notion-logo" },
  { id: "postgres", name: "Postgres · pgvector", transport: "stdio", tools: 4, connected: true, icon: "ph ph-database" },
  { id: "fs", name: "Filesystem", transport: "stdio", tools: 5, connected: false, icon: "ph ph-folder" },
  { id: "minio", name: "MinIO / S3", transport: "http", tools: 3, connected: false, icon: "ph ph-archive-box" },
];

export const INITIAL_LOOP_TASK =
  "Design an idempotency strategy for event ingestion (dedupe retried webhooks)";

export function loopSeed(): LoopRoundSeed[] {
  return [
    {
      author: "forge",
      score: 68,
      draft: "Add an idempotency_key to every event and a UNIQUE index on it. Reject inserts that collide.",
      reviews: [
        { agent: "claude", score: 64, note: "The key alone races — two workers can insert before the index sees the conflict. Use INSERT … ON CONFLICT DO NOTHING and let the DB arbitrate." },
        { agent: "hermes", score: 71, note: "Define what composes the key: source_system + source_id + source_timestamp + a payload hash. Right now it's underspecified." },
      ],
    },
    {
      author: "forge",
      score: 79,
      draft: "idempotency_key = hash(source_system, source_id, source_ts, payload). UNIQUE index; INSERT … ON CONFLICT DO NOTHING RETURNING id. Concurrency handled at the database.",
      reviews: [
        { agent: "claude", score: 82, note: "Better. Add a source_seq so causal order is preserved, not just dedupe." },
        { agent: "hermes", score: 77, note: "Payload hash churns on cosmetic field reordering — canonicalize the JSON before hashing." },
      ],
    },
    {
      author: "forge",
      score: 88,
      draft: "Canonicalize the payload, then hash. Key = source_system + source_id + source_seq. Store source_seq + parent_event_id for causal ordering. ON CONFLICT DO NOTHING.",
      reviews: [
        { agent: "claude", score: 90, note: "Solid. Bound the dedupe window to ~30 days so the unique index stays lean." },
        { agent: "hermes", score: 87, note: "Emit a dedup.suppressed metric so silent drops stay observable." },
      ],
    },
    {
      author: "forge",
      score: 93,
      draft: "Final: canonical hash + (source_system, source_id, source_seq) unique key, parent_event_id for order, 30-day dedupe window, dedup.suppressed metric, ON CONFLICT DO NOTHING RETURNING. Idempotent and observable.",
      reviews: [
        { agent: "claude", score: 94, note: "Meets the bar — ship it." },
        { agent: "hermes", score: 92, note: "Agreed. Causal order and observability are both covered." },
      ],
    },
  ];
}

export function seed(): Record<string, Message[]> {
  return {
    s1: [
      { id: "m1", role: "user", blocks: [{ id: "b1", type: "text", text: "Build an agent status dashboard for stark-os. Pull the requirements from the Notion PRD and the prior test failures — don't make me re-explain the project." }], files: [{ name: "prd-hub.md", icon: "ph ph-file-text" }] },
      {
        id: "m2", role: "assistant", agent: "forge", cost: "$0.71 · 30k tok",
        blocks: [
          { id: "b2", type: "text", text: "Pulled context from the event store: the Notion PRD, 3 prior test failures on auth callbacks, and the approved architecture from your ChatGPT thread. Here's the plan and the first pass." },
          { id: "b3", type: "tool", name: "read_context", detail: "cross-agent memory", status: "done", lines: [
            { text: "notion/prd-hub.md — requirements", icon: "ph ph-check", color: "var(--color-accent-300)" },
            { text: "events: 3 prior auth-callback failures", icon: "ph ph-check", color: "var(--color-accent-300)" },
            { text: "decision: Next.js + PostgreSQL (approved)", icon: "ph ph-check", color: "var(--color-accent-300)" },
          ] },
          { id: "b4", type: "code", file: "src/app/dashboard/page.tsx", code: "export default function Dashboard() {\n  const agents = useProjection(\"agents\");\n  return (\n    <Grid>\n      {agents.map((a) => (\n        <AgentCard key={a.id} agent={a} />\n      ))}\n    </Grid>\n  );\n}" },
          { id: "b5", type: "approval", title: "Deploy to staging", detail: "Push agent-dashboard branch to Coolify staging. 2 files changed, tests passing. Production stays gated on human approval.", gate: "requires you", status: "pending" },
        ],
      },
    ],
    s2: [
      { id: "m1", role: "user", blocks: [{ id: "b1", type: "text", text: "Deployment 37 failed on Coolify. What broke?" }] },
      {
        id: "m2", role: "assistant", agent: "forge", cost: "$0.19 · 8k tok",
        blocks: [
          { id: "b2", type: "text", text: "Compared the failing config against the last successful state (deploy 36). A DATABASE_URL env var was dropped in the config change — same class of failure as the auth-callback issues logged earlier." },
          { id: "b3", type: "tool", name: "diff_config", detail: "deploy 36 → 37", status: "done", lines: [
            { text: "- DATABASE_URL (removed)", icon: "ph ph-minus", color: "#d68f9a" },
            { text: "+ REDIS_URL (added)", icon: "ph ph-plus", color: "var(--color-accent-300)" },
          ] },
          { id: "b4", type: "approval", title: "Restore DATABASE_URL & redeploy", detail: "Re-add the reference vault://stark-os/prod/database-url and trigger deploy 38 to staging.", gate: "requires you", status: "pending" },
        ],
      },
    ],
    s3: [
      { id: "m1", role: "user", blocks: [{ id: "b1", type: "text", text: "Should the event store be Postgres or Mongo? Keep it short." }] },
      {
        id: "m2", role: "assistant", agent: "claude", cost: "$0.11 · 4k tok",
        blocks: [{ id: "b2", type: "text", text: "PostgreSQL. Append-only tables give you the immutable event log, pgvector handles semantic retrieval, and relational projections give the fast UI reads — one engine, no Kafka on day one. Mongo would cost you the relational projections and cross-event joins that the knowledge graph depends on. I'll log this as a decision with the alternatives and the rationale attached." }],
      },
    ],
    s4: [{ id: "m1", role: "assistant", agent: "claude", blocks: [{ id: "b2", type: "text", text: "New chat — ask me anything, or route it to another provider." }] }],
    s5: [{ id: "m1", role: "assistant", agent: "hermes", blocks: [{ id: "b2", type: "text", text: "New chat — ask me anything, or route it to another provider." }] }],
  };
}

export function replyFor(text: string, modelId: string): string {
  void text;
  if (modelId === "hermes")
    return "Routing through Hermes (Nous). I've got the same project context every other agent sees — the PRD, the event history, the open decisions. What do you want me to work through? Whatever I produce lands back in the Hub as an event, attributed to this model.";
  if (modelId === "gpt-web" || modelId === "gpt-desktop")
    return "On it. Because this turn runs through the Hub, I already see the files Forge changed, the last deploy result, and the outstanding technical debt — no need to re-paste anything. Want me to draft the approach, or hand it straight to a coding agent with an approval gate?";
  return "Working from the shared project timeline now — architecture decisions, prior failures, current deploy status and your approvals are all in context. I'll break this into tasks, estimate cost per step, and gate anything that touches production on your approval before acting.";
}
