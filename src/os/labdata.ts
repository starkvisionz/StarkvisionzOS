// Static data for the "Lab" views and settings sub-panels.
// Transcribed from the design prototype.

export interface StakeDef {
  id: string;
  label: string;
  sub: string;
  cost: string;
  tone: "calm" | "warn" | "hot";
  effectIcon: string;
  effect: string;
  policy: [string, string, string][];
}

export const STAKES: StakeDef[] = [
  {
    id: "scratch", label: "Throwaway", sub: "no one sees it", cost: "$0.02", tone: "calm", effectIcon: "ph ph-lightning",
    effect: "Fastest and cheapest path. Nothing is reviewed and nothing is gated — if it's wrong you just run it again.",
    policy: [["Model", "Local 8B", "no API spend"], ["Reviewers", "None", "author only"], ["Gates", "None", "runs unattended"], ["Retries", "1", "fail loud, move on"]],
  },
  {
    id: "internal", label: "Internal", sub: "the team relies on it", cost: "$0.14", tone: "calm", effectIcon: "ph ph-users-three",
    effect: "One reviewer catches the obvious misses. Still unattended, but every run leaves an audit entry you can walk back.",
    policy: [["Model", "Haiku 4.5", "escalates on low score"], ["Reviewers", "1", "Claude critique pass"], ["Gates", "None", "audit-logged only"], ["Retries", "2", "then ask a human"]],
  },
  {
    id: "customer", label: "Customer-facing", sub: "users will see it", cost: "$0.62", tone: "warn", effectIcon: "ph ph-eye",
    effect: "Two reviewers must agree before anything leaves the Hub, and every write waits for your approval in chat.",
    policy: [["Model", "Sonnet 4.5", "no cheap routing"], ["Reviewers", "2", "must both clear 85"], ["Gates", "Writes", "inline approval"], ["Retries", "3", "with diff on each"]],
  },
  {
    id: "money", label: "Touches money", sub: "production, real dollars", cost: "$2.40", tone: "hot", effectIcon: "ph ph-shield-warning",
    effect: "Maximum paranoia. Three reviewers, a dry run against a snapshot first, your signature on every write, and an automatic rollback point before anything executes.",
    policy: [["Model", "Opus + Sonnet", "adversarial pair"], ["Reviewers", "3", "unanimous, incl. Hermes"], ["Gates", "Every write", "human signature"], ["Retries", "5", "rollback point each"]],
  },
];

export interface PluginDef {
  id: string;
  name: string;
  cat: string;
  kind: string;
  official: boolean;
  icon: string;
  desc: string;
  perms: [string, string][];
  meta: string;
}

export const PLUGINS: PluginDef[] = [
  { id: "linear", name: "Linear", cat: "workflow", kind: "workflow", official: true, icon: "ph ph-kanban", desc: "Turns approved agent plans into Linear issues and closes them when the deploy verifies.", perms: [["ph ph-scroll", "read events"], ["ph ph-arrow-square-out", "write to Linear"]], meta: "v2.4 · 1.2k installs" },
  { id: "slack", name: "Slack digest", cat: "workflow", kind: "workflow", official: true, icon: "ph ph-chat-dots", desc: "Posts the Nightshift morning brief and any approval request into a channel you pick.", perms: [["ph ph-scroll", "read events"], ["ph ph-bell", "notify"]], meta: "v1.9 · 3.4k installs" },
  { id: "sentry", name: "Sentry watchdog", cat: "signals", kind: "signal", official: false, icon: "ph ph-bug-beetle", desc: "Feeds production errors in as events, so autonomous recovery can trigger on a real stack trace instead of a failed deploy.", perms: [["ph ph-download", "ingest events"], ["ph ph-play", "trigger recovery"]], meta: "v0.8 · community" },
  { id: "gitguard", name: "Commit guard", cat: "guards", kind: "veto", official: true, icon: "ph ph-shield-check", desc: "Can veto an agent action before it runs — blocks any write touching migrations without a rollback point.", perms: [["ph ph-prohibit", "veto actions"], ["ph ph-git-commit", "read repo"]], meta: "v3.1 · 890 installs" },
  { id: "ledger", name: "Cost ledger export", cat: "signals", kind: "export", official: false, icon: "ph ph-receipt", desc: "Streams per-turn cost attribution to a warehouse table so finance can see AI spend by project.", perms: [["ph ph-scroll", "read events"], ["ph ph-upload", "write external"]], meta: "v1.2 · community" },
  { id: "figma", name: "Figma sync", cat: "workflow", kind: "view", official: false, icon: "ph ph-figma-logo", desc: "Adds a Designs view and links frames to the requirement nodes they satisfy in the memory graph.", perms: [["ph ph-layout", "add view"], ["ph ph-share-network", "write graph"]], meta: "v0.5 · beta" },
];

export const REGRET_AGENTS = [
  { id: "forge", name: "Forge", icon: "ph ph-hammer", regret: "0.11", pct: 11, note: "sure and right — 34 of 38 calls held up" },
  { id: "claude", name: "Claude 4.5", icon: "ph ph-sparkle", regret: "0.19", pct: 19, note: "hedges well; wrong calls were flagged as uncertain" },
  { id: "hermes", name: "Hermes", icon: "ph ph-shield-check", regret: "0.41", pct: 41, note: "overconfident on infra — discount its certainty" },
];

export const REGRET_ROWS = [
  { decision: "Chose Next.js + PostgreSQL over React + FastAPI", by: "Forge", when: "Mar 04", conf: "88%", outcome: "held", gap: "−0.04 regret", good: true as boolean | null,
    claimed: "Faster to ship, one deploy target, cheaper to maintain at this size.", actual: "Shipped 3 hours earlier than the estimate. No migration regret in 4 months." },
  { decision: "Skipped the idempotency key on first ingest build", by: "Hermes", when: "Apr 19", conf: "76%", outcome: "failed", gap: "+0.62 regret", good: false as boolean | null,
    claimed: "Retries are rare enough that dedupe is premature optimization.", actual: "412 duplicate rows and a two-week detour. This is the migration Nightshift just drafted." },
  { decision: "Kept reviewer calls on Sonnet instead of Haiku", by: "Claude 4.5", when: "Jun 02", conf: "61%", outcome: "mixed", gap: "+0.22 regret", good: null as boolean | null,
    claimed: "Haiku would miss the subtle critiques that move the loop score.", actual: "Right about quality, wrong about cost — reviewer spend is now 31% above trend." },
  { decision: "Deployed to Frankfurt rather than the US region", by: "Hermes", when: "Jun 28", conf: "94%", outcome: "failed", gap: "+0.71 regret", good: false as boolean | null,
    claimed: "Latency to the primary database is lower and compliance is simpler.", actual: "Database is US-east. Every write crosses the Atlantic twice; 94% confidence was unearned." },
];

export const NEG_TURNS = [
  { side: "a", name: "Forge", role: "wants to ship", icon: "ph ph-hammer", says: "Friday or we lose the window — the team is blocked on the new schema and every day of waiting is a day of double maintenance.", wants: "Friday ship", gives: "" },
  { side: "b", name: "Hermes", role: "wants it safe", icon: "ph ph-shield-check", says: "Shipping before the backfill means two weeks where historical queries silently return partial data. That's worse than late.", wants: "backfill first", gives: "" },
  { side: "a", name: "Forge", role: "concedes", icon: "ph ph-hammer", says: "Then put it behind a flag. Ship the code Friday, keep the old read path live, flip when the backfill lands.", wants: "Friday ship", gives: "the clean cutover" },
  { side: "b", name: "Hermes", role: "counters", icon: "ph ph-shield-check", says: "A flag works if writes go to both paths for 48 hours — otherwise the flip loses whatever arrived in between. And I'd want the audit before the flip, not after.", wants: "dual-write + pre-flip audit", gives: "the hard block on Friday" },
  { side: "a", name: "Forge", role: "closes", icon: "ph ph-hammer", says: "Dual-write for 48 hours, yes. Audit after the flip — you'll have live data to audit against instead of a snapshot, which is a better audit anyway.", wants: "post-flip audit", gives: "48 hours of double writes" },
  { side: "b", name: "Hermes", role: "accepts", icon: "ph ph-shield-check", says: "Accepted, on the condition that the old read path stays readable through Monday. If the audit finds drift I want somewhere to fall back to.", wants: "rollback path to Monday", gives: "the pre-ship audit" },
];

export const BLIND_SPOTS = [
  { id: "b1", q: "Which region is the production database actually in?", area: "infra", areaTone: "warn", assumed: "Agents have assumed US-east from a stale config comment. The Frankfurt deploy regret traces directly back to this gap.", hits: 14, rides: "2 deploys, 1 latency budget", sev: 92 },
  { id: "b2", q: "Who is allowed to approve a production migration?", area: "policy", areaTone: "warn", assumed: "Assumed 'Eric only' from a March conversation. Never confirmed, and the Nightshift migration is waiting on it.", hits: 9, rides: "the pending dedupe migration", sev: 78 },
  { id: "b3", q: "What is the real monthly budget ceiling?", area: "cost", areaTone: "plain", assumed: "Guardrail says $50 but agents keep treating it as soft. Unclear whether it's a cap or a warning.", hits: 7, rides: "every model routing decision", sev: 61 },
  { id: "b4", q: "Is there a downstream consumer of the events table?", area: "data", areaTone: "plain", assumed: "No consumer found in this repo, so agents assume none exists. If one does, the dedupe migration breaks it silently.", hits: 5, rides: "the dedupe migration", sev: 54 },
  { id: "b5", q: "What counts as 'done' for this project?", area: "scope", areaTone: "plain", assumed: "Assumed feature-complete when the Hub replaces the three tools it was built to replace. Never stated.", hits: 3, rides: "loop convergence thresholds", sev: 31 },
];

export const CLAIMS = [
  { id: "c1", text: "The event table retains 90 days; anything older is rolled into monthly aggregates.", source: "migrations/0042_retention.sql", srcIcon: "ph ph-database", age: "4 days ago", half: "90d", conf: 94 },
  { id: "c2", text: "Coolify deploys go out on the container host in Frankfurt, not the US region.", source: "infra/coolify.toml", srcIcon: "ph ph-file-code", age: "3 weeks ago", half: "30d", conf: 71 },
  { id: "c3", text: "Claude Sonnet 4.5 is the cheapest model that clears the reviewer bar for this project.", source: "pricing page · scraped", srcIcon: "ph ph-globe", age: "2 months ago", half: "14d", conf: 38 },
  { id: "c4", text: "Only Eric has write access to the production database.", source: "conversation · Mar 12", srcIcon: "ph ph-chat-circle", age: "4 months ago", half: "60d", conf: 44 },
];

export const NIGHT_FINDINGS = [
  { kind: "answered", icon: "ph-fill ph-lightbulb", title: "Closed an open question from 16:40", at: "01:12",
    body: "You asked why ingest latency doubled on Tuesdays and moved on. Overnight the Hub correlated it with the weekly Coolify backup window — the two jobs share one volume. Staggering the backup by 40 minutes removes the spike.", approve: true },
  { kind: "pruned", icon: "ph ph-scissors", title: "Pruned 3 contradictions from memory", at: "02:05",
    body: "Three notes claimed different retention windows for the event table (7 / 30 / 90 days). Traced each to its commit and kept the one the migration actually enforces. The other two are archived, not deleted.", approve: false },
  { kind: "drafted", icon: "ph ph-file-text", title: "Drafted the dedupe migration you'll need", at: "03:48",
    body: "Wrote the canonical-hash migration plus a dry-run report against a snapshot of production: 412 duplicate rows would collapse, none of them load-bearing. Waiting on you before it touches anything.", approve: true },
  { kind: "watch", icon: "ph ph-eye", title: "One thing worth your attention", at: "05:20",
    body: "Anthropic spend is tracking 31% above last week at the same point in the cycle, entirely from the loop view's reviewer calls. Not over budget yet — over trend.", approve: false },
];

// ── memory graph ──
export interface GraphNodeDef {
  id: string;
  type: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  r: number;
  refs: number;
  conf: number;
  glyph: string;
}

export const GN: GraphNodeDef[] = [
  { id: "req", type: "req", label: "Requirement", sub: "status dashboard", x: 96, y: 96, r: 22, refs: 14, conf: 96, glyph: "REQ" },
  { id: "constraint", type: "constraint", label: "Constraint", sub: "$50/mo ceiling", x: 96, y: 250, r: 19, refs: 9, conf: 62, glyph: "CON" },
  { id: "decision", type: "decision", label: "Datastore", sub: "PostgreSQL", x: 268, y: 168, r: 32, refs: 38, conf: 94, glyph: "DEC" },
  { id: "retention", type: "decision", label: "Retention", sub: "90 days", x: 268, y: 336, r: 22, refs: 11, conf: 88, glyph: "DEC" },
  { id: "forge", type: "agent", label: "Forge", sub: "trust 0.81", x: 152, y: 384, r: 20, refs: 26, conf: 90, glyph: "AGT" },
  { id: "artifact", type: "artifact", label: "schema.sql", sub: "v2", x: 424, y: 300, r: 21, refs: 17, conf: 92, glyph: "ART" },
  { id: "region", type: "gap", label: "DB region", sub: "assumed", x: 448, y: 402, r: 18, refs: 14, conf: 30, glyph: "?" },
  { id: "deploy", type: "artifact", label: "Deploy 38", sub: "healthy", x: 452, y: 112, r: 21, refs: 12, conf: 86, glyph: "ART" },
  { id: "cost", type: "cost", label: "Spend", sub: "$18.40", x: 300, y: 42, r: 18, refs: 21, conf: 99, glyph: "$" },
  { id: "test", type: "artifact", label: "Test 2291", sub: "12 passed", x: 566, y: 214, r: 17, refs: 6, conf: 84, glyph: "ART" },
];

export const GTYPES: Record<string, { label: string; color: string }> = {
  req: { label: "Requirements", color: "var(--color-accent)" },
  decision: { label: "Decisions", color: "var(--color-accent-300)" },
  agent: { label: "Agents", color: "#8fb7d6" },
  artifact: { label: "Artifacts", color: "var(--color-neutral-300)" },
  constraint: { label: "Constraints", color: "#d6c07a" },
  cost: { label: "Cost", color: "#d6c07a" },
  gap: { label: "Gaps", color: "#d68f9a" },
};

// [from, to, label, dashed]
export const EDGES: [string, string, string, boolean][] = [
  ["req", "decision", "caused", false],
  ["constraint", "decision", "bounded", false],
  ["constraint", "retention", "bounded", false],
  ["decision", "retention", "implies", false],
  ["decision", "forge", "assigned", false],
  ["forge", "artifact", "wrote", false],
  ["retention", "artifact", "encoded in", false],
  ["artifact", "deploy", "shipped in", false],
  ["artifact", "region", "assumes", true],
  ["deploy", "region", "assumes", true],
  ["decision", "deploy", "", false],
  ["forge", "test", "", false],
  ["test", "deploy", "verified", false],
  ["cost", "decision", "attributed", false],
];

export interface GraphDetail {
  title: string;
  type: string;
  note: string;
  stats: [string, string][];
  prov: [string, string, string][];
  links: [string, string, string, string][];
}

export const GDET: Record<string, GraphDetail> = {
  decision: { title: "PostgreSQL event store", type: "Decision", note: "Chosen over MongoDB for append-only immutability, relational projections and pgvector in one engine. Still the lowest-regret call in the project.",
    stats: [["38", "refs"], ["4 mo", "age"], ["0.04", "regret"]],
    prov: [["ph ph-chats-circle", "Asserted in session s2", "Mar 04 · turn 7"], ["ph ph-scroll", "Event dec_204", "signed by Eric Stark"], ["ph ph-arrows-clockwise", "Re-affirmed by replay", "Jun 02 · held"]],
    links: [["ph ph-file-text", "Requirement: dashboard", "caused by", "req"], ["ph ph-hammer", "Agent: Forge", "assigned", "forge"], ["ph ph-hourglass-medium", "Retention: 90 days", "implies", "retention"], ["ph ph-rocket-launch", "Deploy 38", "shipped", "deploy"]] },
  req: { title: "Agent status dashboard", type: "Requirement", note: "Captured from the Notion PRD during a ChatGPT session and normalized into the event store — the root of most of this graph.",
    stats: [["14", "refs"], ["5 mo", "age"], ["96%", "conf"]],
    prov: [["ph ph-file-text", "Notion PRD, page 3", "imported Feb 26"], ["ph ph-chats-circle", "Restated in session s1", "Mar 01"]],
    links: [["ph ph-git-fork", "Datastore decision", "caused", "decision"], ["ph ph-currency-dollar", "Spend attributed", "costs", "cost"]] },
  constraint: { title: "$50 / month ceiling", type: "Constraint", note: "Bounds every routing and retention decision below it. Whether this is a hard cap or a warning has never been confirmed — one of the open blind spots.",
    stats: [["9", "refs"], ["3 mo", "age"], ["62%", "conf"]],
    prov: [["ph ph-chat-circle", "Stated in conversation", "Apr 11 · never confirmed"], ["ph ph-gauge", "Enforced by guardrail", "soft warning only"]],
    links: [["ph ph-git-fork", "Datastore decision", "bounded", "decision"], ["ph ph-hourglass-medium", "Retention window", "bounded", "retention"]] },
  retention: { title: "90-day retention", type: "Decision", note: "Events older than 90 days roll into monthly aggregates. Derived from the cost ceiling, not from a product requirement — worth revisiting if the ceiling moves.",
    stats: [["11", "refs"], ["4 days", "age"], ["88%", "conf"]],
    prov: [["ph ph-database", "migrations/0042_retention.sql", "enforced in schema"], ["ph ph-scales", "Superseded two earlier notes", "pruned by Nightshift"]],
    links: [["ph ph-coins", "Cost ceiling", "bounded by", "constraint"], ["ph ph-database", "schema.sql v2", "encoded in", "artifact"]] },
  forge: { title: "Forge", type: "Agent", note: "Implementation agent. Wrote the schema and the dashboard projections; lowest regret score of the three agents.",
    stats: [["26", "refs"], ["0.81", "trust"], ["0.11", "regret"]],
    prov: [["ph ph-scroll", "38 scored decisions", "34 held up"], ["ph ph-check-circle", "Test run 2291", "12 passed"]],
    links: [["ph ph-database", "schema.sql v2", "wrote", "artifact"], ["ph ph-check-circle", "Test 2291", "ran", "test"], ["ph ph-git-fork", "Datastore decision", "assigned", "decision"]] },
  artifact: { title: "schema.sql v2", type: "Artifact", note: "Event table with the idempotency key and monthly partitions. The dedupe migration Nightshift drafted targets this file.",
    stats: [["17", "refs"], ["v2", "version"], ["92%", "conf"]],
    prov: [["ph ph-git-commit", "commit 4f2a91c", "by Forge · Jun 30"], ["ph ph-rocket-launch", "Shipped in deploy 38", "healthy"]],
    links: [["ph ph-hammer", "Forge", "written by", "forge"], ["ph ph-rocket-launch", "Deploy 38", "shipped in", "deploy"], ["ph ph-question", "DB region", "assumes", "region"]] },
  region: { title: "Production DB region", type: "Gap", note: "Nothing in the event store establishes this. Agents have been assuming US-east from a stale config comment — the Frankfurt deploy regret traces straight back to this node.",
    stats: [["14", "guesses"], ["30%", "conf"], ["2", "bad calls"]],
    prov: [["ph ph-warning-octagon", "No supporting event", "assumption only"], ["ph ph-scales", "Caused regret +0.71", "Frankfurt deploy"]],
    links: [["ph ph-database", "schema.sql v2", "assumed by", "artifact"], ["ph ph-rocket-launch", "Deploy 38", "assumed by", "deploy"]] },
  deploy: { title: "Deploy 38", type: "Deployment", note: "Healthy after autonomous recovery replaced the failed deploy 37. Region choice on this deploy is the one that went wrong.",
    stats: [["12", "refs"], ["3m 12s", "recovery"], ["86%", "conf"]],
    prov: [["ph ph-heartbeat", "Recovered from deploy 37", "run_1183"], ["ph ph-check-circle", "Verified in production", "21:29"]],
    links: [["ph ph-database", "schema.sql v2", "ships", "artifact"], ["ph ph-question", "DB region", "assumes", "region"], ["ph ph-check-circle", "Test 2291", "verified by", "test"]] },
  cost: { title: "$18.40 today", type: "Cost record", note: "Spend attributed to work descending from the datastore decision. 31% above trend, entirely from reviewer calls.",
    stats: [["21", "refs"], ["$18.40", "today"], ["+31%", "trend"]],
    prov: [["ph ph-receipt", "Per-turn attribution", "rebuilt from events"], ["ph ph-gauge", "Against $50 ceiling", "37% used"]],
    links: [["ph ph-git-fork", "Datastore decision", "attributed", "decision"], ["ph ph-coins", "Cost ceiling", "measured against", "constraint"]] },
  test: { title: "Test run 2291", type: "Test", note: "Twelve tests green on develop before the deploy went out.",
    stats: [["6", "refs"], ["12", "passed"], ["0", "failed"]],
    prov: [["ph ph-hammer", "Triggered by Forge", "Jun 30 · 20:51"]],
    links: [["ph ph-rocket-launch", "Deploy 38", "verified", "deploy"], ["ph ph-hammer", "Forge", "ran by", "forge"]] },
};

export const GQ = {
  title: "Why does the 90-day retention window exist?",
  hops: "4 hops · 3 events",
  path: [["Constraint · $50 ceiling", "constraint"], ["Decision · PostgreSQL", "decision"], ["Decision · 90-day retention", "retention"], ["Artifact · migrations/0042", "artifact"]] as [string, string][],
  answer: "It is a cost decision, not a product one. The $50 monthly ceiling — itself asserted in conversation on Apr 11 and never confirmed — bounded the datastore decision, which set retention at 90 days to keep the index lean. It is enforced in migrations/0042_retention.sql. If the ceiling was only ever a warning, this window has no other justification.",
};

// ── branches / replay / market / recovery / counterfactual ──
export const BRANCHES = [
  { id: "a", letter: "A", title: "Next.js + PostgreSQL", agent: "Forge", agentIcon: "ph ph-hammer", recommended: true, metrics: [["Infra / mo", "$820", "ok"], ["Build effort", "3.5 hr", "good"], ["Risk", "Low", "good"], ["Perf score", "94", "good"]] as [string, string, string][] },
  { id: "b", letter: "B", title: "React + FastAPI", agent: "Claude", agentIcon: "ph ph-sparkle", recommended: false, metrics: [["Infra / mo", "$1,100", "warn"], ["Build effort", "5 hr", "warn"], ["Risk", "Medium", "warn"], ["Perf score", "88", "ok"]] as [string, string, string][] },
  { id: "c", letter: "C", title: "Cloudflare-native", agent: "Hermes", agentIcon: "ph ph-infinity", recommended: false, metrics: [["Infra / mo", "$540", "good"], ["Build effort", "6.5 hr", "warn"], ["Risk", "High", "bad"], ["Perf score", "91", "ok"]] as [string, string, string][] },
];

export const REPLAY_DIFFS = [
  { icon: "ph ph-plus", text: "partition events by month", color: "var(--color-accent-300)" },
  { icon: "ph ph-plus", text: "HNSW index on embeddings", color: "var(--color-accent-300)" },
  { icon: "ph ph-equals", text: "keep append-only, no Kafka", color: "var(--color-neutral-500)" },
];

export const MARKET: Record<string, [string, string, string, string, string][]> = {
  Coding: [["Forge", "76%", "$3.84", "11m", "forge"], ["Claude", "71%", "$2.10", "18m", "claude"], ["ChatGPT", "68%", "$1.90", "22m", "gpt-desktop"]],
  Research: [["Claude", "88%", "$0.42", "9m", "claude"], ["ChatGPT", "79%", "$0.30", "12m", "gpt-web"], ["Hermes", "74%", "$0.09", "6m", "hermes"]],
  Deploy: [["Forge", "82%", "$2.19", "4m", "forge"], ["Claude", "70%", "$0.90", "7m", "claude"], ["Hermes", "61%", "$0.20", "5m", "hermes"]],
  Summarize: [["Hermes", "91%", "$0.09", "6m", "hermes"], ["ChatGPT", "83%", "$0.28", "8m", "gpt-web"], ["Claude", "80%", "$0.40", "10m", "claude"]],
};

export const RECOVERY_STEPS = [
  { label: "Failure detected", detail: "deploy 37 · missing env" },
  { label: "Capture last good state", detail: "snapshot deploy 36" },
  { label: "Diff configuration", detail: "DATABASE_URL removed" },
  { label: "Diagnose (Forge)", detail: "restore vault reference" },
  { label: "Test fix in sandbox", detail: "isolated container" },
  { label: "Propose + await approval", detail: "human gate" },
  { label: "Redeploy 38", detail: "Coolify staging" },
  { label: "Verify production health", detail: "health checks green" },
];

export const CF_METRICS = [
  { k: "Infra cost / mo", base: "$820", alt: "$540", baseW: "62%", altW: "41%", delta: "−$280", good: true },
  { k: "Time to ship", base: "3.5 hr", alt: "6.5 hr", baseW: "45%", altW: "84%", delta: "+3 hr", good: false },
  { k: "Security exposure", base: "Low", alt: "Medium", baseW: "30%", altW: "58%", delta: "higher", good: false },
  { k: "Maintenance burden", base: "Moderate", alt: "High", baseW: "42%", altW: "70%", delta: "higher", good: false },
];

export const CF_VERDICT =
  "Cheaper infra, but +3 hr to ship, higher security exposure and more maintenance. Net: the chosen Next.js + PostgreSQL path was the better call — the $280/mo saving didn't justify the added risk and effort.";

// ── dashboard / library / audit static data ──
export const DASH_STATS = [
  { kicker: "First-pass", value: "74%", meta: "accepted, no rework", icon: "ph ph-check-circle" },
  { kicker: "Spend today", value: "$18.40", meta: "across 4 agents", icon: "ph ph-coins" },
  { kicker: "Open tasks", value: "6", meta: "2 awaiting approval", icon: "ph ph-list-checks" },
  { kicker: "Recovery", value: "3m 12s", meta: "avg deploy fix", icon: "ph ph-arrow-counter-clockwise" },
];

export const DASH_AGENTS = [
  { name: "Forge", role: "Software implementation", icon: "ph ph-hammer", bg: "color-mix(in srgb,var(--color-accent) 22%,var(--color-surface))", fg: "var(--color-accent)", state: "Working", stateClass: "tag-accent", trust: "0.81", firstPass: "76%", cost: "$3.84", trustPct: "81%" },
  { name: "Claude", role: "Research & decisions", icon: "ph ph-sparkle", bg: "color-mix(in srgb,#c9a27f 22%,var(--color-surface))", fg: "#c9a27f", state: "Idle", stateClass: "tag-neutral", trust: "0.88", firstPass: "84%", cost: "$0.42", trustPct: "88%" },
  { name: "ChatGPT", role: "Drafting & planning", icon: "ph ph-chat-circle-dots", bg: "color-mix(in srgb,#7fbfa8 22%,var(--color-surface))", fg: "#7fbfa8", state: "Idle", stateClass: "tag-neutral", trust: "0.79", firstPass: "72%", cost: "$0.28", trustPct: "79%" },
  { name: "Hermes", role: "Summaries & extraction", icon: "ph ph-infinity", bg: "color-mix(in srgb,var(--color-accent-400) 22%,var(--color-surface))", fg: "var(--color-accent-400)", state: "Idle", stateClass: "tag-neutral", trust: "0.73", firstPass: "69%", cost: "$0.09", trustPct: "73%" },
];

export const DASH_TASKS = [
  { name: "Build agent dashboard", agent: "Forge", cost: "$4.28", human: "45 min", rework: "Low", outcome: "Accepted", outClass: "tag-accent" },
  { name: "Create authentication", agent: "Forge", cost: "$11.64", human: "3.5 hr", rework: "High", outcome: "Rebuilt", outClass: "tag-neutral" },
  { name: "Fix deployment 37", agent: "Forge", cost: "$2.19", human: "20 min", rework: "None", outcome: "Resolved", outClass: "tag-accent" },
  { name: "Summarize PRD", agent: "Hermes", cost: "$0.09", human: "5 min", rework: "None", outcome: "Accepted", outClass: "tag-accent" },
];

export const LIBRARY_ARTIFACTS = [
  { title: "Architecture Decision 204", type: "Decision record", ver: 3, source: "Claude", size: "4.2 KB", updated: "2m ago", icon: "ph ph-git-fork", fg: "var(--color-accent)" },
  { title: "prd-hub.md", type: "Requirements", ver: 7, source: "Notion", size: "18 KB", updated: "1h ago", icon: "ph ph-file-text", fg: "#7fbfa8" },
  { title: "schema.sql", type: "Database", ver: 2, source: "Forge", size: "6.1 KB", updated: "3h ago", icon: "ph ph-database", fg: "var(--color-accent-400)" },
  { title: "agent-dashboard.tsx", type: "Source", ver: 5, source: "Forge", size: "2.4 KB", updated: "21:14", icon: "ph ph-file-ts", fg: "var(--color-accent-300)" },
  { title: "deploy-38.yaml", type: "Config", ver: 1, source: "Coolify", size: "1.1 KB", updated: "21:41", icon: "ph ph-file-code", fg: "#c9a27f" },
  { title: "cost-report-jul.csv", type: "Cost report", ver: 1, source: "Hub", size: "820 B", updated: "yesterday", icon: "ph ph-table", fg: "var(--color-neutral-400)" },
  { title: "qsbs-memo.md", type: "Memo", ver: 2, source: "Claude", size: "9.4 KB", updated: "yesterday", icon: "ph ph-file-text", fg: "#7fbfa8" },
  { title: "hub-mock.fig", type: "Design", ver: 4, source: "Upload", size: "3.2 MB", updated: "2d ago", icon: "ph ph-figma-logo", fg: "var(--color-accent-400)" },
];

export const AUDIT_ROWS = [
  { id: "evt_01K2AF9R8M", type: "agent.code_modified", actor: "agent_forge", ver: 3, cost: "$0.71", approval: "Pending", apClass: "tag-outline" },
  { id: "evt_01K2AF7Q2X", type: "deployment.failed", actor: "coolify", ver: 2, cost: "—", approval: "N/A", apClass: "tag-neutral" },
  { id: "evt_01K2AF5M9P", type: "agent.diagnosed", actor: "agent_forge", ver: 3, cost: "$0.19", approval: "N/A", apClass: "tag-neutral" },
  { id: "evt_01K2AF3H1Z", type: "human.change_approved", actor: "Eric Stark", ver: 1, cost: "—", approval: "Approved", apClass: "tag-accent" },
  { id: "evt_01K2AF1D7C", type: "deployment.succeeded", actor: "agent_forge", ver: 3, cost: "$0.00", approval: "Approved", apClass: "tag-accent" },
  { id: "evt_01K2AEZB4T", type: "session.message", actor: "Hermes", ver: 2, cost: "$0.09", approval: "N/A", apClass: "tag-neutral" },
];

// ── spend chart ──  [day, productive, rework]
export const SPEND: [string, number, number][] = [
  ["Mon", 2.1, 0.3], ["Tue", 3.4, 1.1], ["Wed", 1.8, 0.1], ["Thu", 4.2, 0.9], ["Fri", 2.6, 0.2], ["Sat", 0.7, 0], ["Sun", 3.6, 0.4],
];
