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

export interface LoopRoundSeed {
  author: string;
  score: number;
  draft: string;
  reviews: { agent: string; score: number; note: string }[];
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
}
