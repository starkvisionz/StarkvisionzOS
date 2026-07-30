// Core domain + UI-state types for Starkvisionz OS.

export type ViewId =
  | "chat"
  | "dash"
  | "timeline"
  | "loop"
  | "library"
  | "audit"
  | "graph"
  | "branches"
  | "replay"
  | "market"
  | "recovery"
  | "counter"
  | "truth"
  | "night"
  | "regret"
  | "negotiate"
  | "blind"
  | "settings";

export type SettingsTab =
  | "prompt"
  | "tools"
  | "plugins"
  | "mcp"
  | "risk"
  | "memory"
  | "providers"
  | "appearance";

export interface ModelDef {
  id: string;
  name: string;
  sub: string;
  dot: string;
}

export interface Session {
  id: string;
  title: string;
  grp: string;
  dot: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  summary: string;
  time?: string;
  actor: string;
  evidence: string;
  icon: string;
  dot: string;
  fresh?: boolean;
  cost?: number;
  approval?: string;
  createdAt?: string;
}

/** A block inside an assistant message. */
export interface Block {
  id: string;
  type: "text" | "tool" | "code" | "approval";
  // text
  text?: string;
  streaming?: boolean;
  // tool
  name?: string;
  detail?: string;
  status?: string;
  lines?: { text: string; icon: string; color: string }[];
  // code
  file?: string;
  code?: string;
  // approval
  title?: string;
  gate?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  agent?: string;
  cost?: string;
  blocks: Block[];
  files?: { name: string; icon: string }[];
  // backend-backed extras (real chat)
  tokens?: number;
  usd?: number;
  agentName?: string;
  agentIcon?: string;
  agentDot?: string;
}

export interface ChatModel {
  id: string;
  name: string;
  sub: string;
  dot: string;
}

export interface DashProj {
  spend: number;
  messages: number;
  tokens: number;
  sessions: number;
  spendDays: { day: string; date: string; spend: number }[];
  apiKey: boolean;
}

export interface Repo {
  id: string;
  name: string;
  branch: string;
  meta: string;
  state: "clean" | "ahead" | "dirty";
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  meta: string;
  repos: Repo[];
}

export interface McpServer {
  id: string;
  name: string;
  transport: string;
  tools: number;
  connected: boolean;
  icon: string;
}

export interface LoopReview {
  agent: string;
  score: number;
  note: string;
  name?: string;
  icon?: string;
  dot?: string;
}

export interface LoopRoundSeed {
  author: string;
  score: number;
  draft: string;
  reviews: LoopReview[];
  authorName?: string;
  authorIcon?: string;
  authorDot?: string;
}

export interface NightFinding {
  kind: string;
  title: string;
  body: string;
}

export interface ReplayDiff {
  kind: string; // "add" | "change" | "drop"
  text: string;
}

export interface ReplaySide {
  content: string;
  model: string;
  modelName: string;
  dot: string;
  cost: number;
}

export interface BranchResult {
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
  recommended: boolean;
}

export interface BlindSpot {
  id: string;
  q: string;
  area: string;
  assumed: string;
  rides: string;
  sev: number;
}

export interface CfMetric {
  k: string;
  base: string;
  alt: string;
  baseW: number;
  altW: number;
  delta: string;
  good: boolean;
}

export interface ModelUsage {
  model: string;
  name: string;
  sub: string;
  dot: string;
  messages: number;
  spend: number;
  tokens: number;
}

export interface Claim {
  id: string;
  text: string;
  source: string;
  conf: number;
  half: string;
}

export interface GraphNodeReal {
  id: string;
  type: string;
  label: string;
  sub: string;
  refs: number;
  ts: string;
  actor: string;
  summary: string;
}

export interface GraphEdgeReal {
  from: string;
  to: string;
  label: string;
}

export interface TracePathItem {
  label: string;
  type: string;
}

export interface TraceResult {
  title: string;
  answer: string;
  hops: string;
  path: TracePathItem[];
}

export interface State {
  view: ViewId;
  pickerOpen: boolean;
  modelId: string;
  activeId: string;
  streaming: boolean;
  attachments: { name: string; icon: string }[];
  sessions: Session[];
  msgs: Record<string, Message[]>;
  liveOn: boolean;
  events: TimelineEvent[];
  settingsTab: SettingsTab;
  sysPrompt: string;
  aboutText: string;
  tools: Record<string, boolean>;
  mcp: McpServer[];
  promptSaved: boolean;
  loopTask: string;
  loopRunning: boolean;
  loopDone: boolean;
  loopRevealed: number;
  loopScript: LoopRoundSeed[];
  paletteOpen: boolean;
  paletteQuery: string;
  timeTravel: boolean;
  ttPos: number;
  graphSel: string;
  graphHidden: Record<string, boolean>;
  graphDepth: number;
  gqValue: string;
  gqAnswered: boolean;
  gqRunning: boolean;
  graphReal: { nodes: GraphNodeReal[]; edges: GraphEdgeReal[] } | null;
  graphLoaded: boolean;
  gqResult: TraceResult | null;
  gqError: string;
  plugins: Record<string, boolean>;
  pluginCat: string;
  guards: Record<string, boolean>;
  mem: Record<string, boolean>;
  appear: Record<string, boolean>;
  cap: number;
  capAction: string;
  density: string;
  half: number;
  projId: string;
  repoId: string;
  projOpen: boolean;
  repoOpen: boolean;
  claimConf: Record<string, number>;
  claimAge: Record<string, string>;
  checking: Record<string, boolean>;
  nightRunning: boolean;
  nightRevealed: number;
  negRunning: boolean;
  negRevealed: number;
  negDeal: boolean;
  closedSpots: Record<string, boolean>;
  stake: string;
  replayRunning: boolean;
  replayDone: boolean;
  mergedBranch: string | null;
  recRunning: boolean;
  recDone: boolean;
  recStep: number;
  cfRunning: boolean;
  cfDone: boolean;
  marketCat: string;
  // ── backend-backed chat + projections ──
  chatModels: ChatModel[];
  apiKey: boolean;
  booted: boolean;
  dash: DashProj | null;
  needsAuth: boolean;
  loopError: string;
  nightReal: NightFinding[];
  nightError: string;
  replayError: string;
  replayPrompt: string;
  replayOrig: ReplaySide | null;
  replayNew: ReplaySide | null;
  replayNewText: string;
  replayReal: ReplayDiff[];
  branchTask: string;
  branchRunning: boolean;
  branchError: string;
  branchReal: BranchResult[];
  branchRationale: string;
  blindRunning: boolean;
  blindError: string;
  blindReal: BlindSpot[];
  cfDecision: string;
  cfAlternative: string;
  cfError: string;
  cfMetricsReal: CfMetric[];
  cfVerdictReal: string;
  marketReal: ModelUsage[];
  truthReal: Claim[];
  truthRunning: boolean;
  truthError: string;
}
