// Pure projection: turns raw State into the flat view-model the views render.
// This mirrors the prototype's renderVals() one-to-one.

import type { State } from "./types";
import type { Actions } from "./useController";
import { MODELS, PROJECTS, agentMeta } from "./data";
import {
  BLIND_SPOTS,
  BRANCHES,
  CF_METRICS,
  CF_VERDICT,
  CLAIMS,
  DASH_AGENTS,
  DASH_STATS,
  DASH_TASKS,
  EDGES,
  GDET,
  GN,
  GQ,
  GTYPES,
  LIBRARY_ARTIFACTS,
  MARKET,
  NEG_TURNS,
  PLUGINS,
  RECOVERY_STEPS,
  REGRET_AGENTS,
  REGRET_ROWS,
  SPEND,
  STAKES,
} from "./labdata";

export interface BlockVM {
  isText?: boolean;
  isTool?: boolean;
  isCode?: boolean;
  isApproval?: boolean;
  text?: string;
  streaming?: boolean;
  name?: string;
  detail?: string;
  status?: string;
  lines?: { text: string; icon: string; color: string }[];
  file?: string;
  code?: string;
  title?: string;
  gate?: string;
  pending?: boolean;
  statusLabel?: string;
  tagClass?: string;
  icon?: string;
  iconColor?: string;
  borderColor?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

export interface UserMsgVM {
  isUser: true;
  isAssistant: false;
  text: string;
  hasFiles: boolean;
  files: { name: string; icon: string }[];
}

export interface AsstMsgVM {
  isUser: false;
  isAssistant: true;
  agentName: string;
  agentSub: string;
  agentIcon: string;
  agentBg: string;
  agentFg: string;
  agentGlow: string;
  cost: string;
  blocks: BlockVM[];
}

export type MsgVM = UserMsgVM | AsstMsgVM;

export function deriveVals(s: State, a: Actions) {
  const dash = s.dash;
  const chatModels = s.chatModels;
  const model =
    chatModels.find((m) => m.id === s.modelId) ||
    chatModels[0] || { id: s.modelId, name: "Claude", sub: "", dot: "var(--color-accent)" };
  const activeSession = s.sessions.find((x) => x.id === s.activeId);

  const navDefs = [
    { v: "chat" as const, label: "Chat", icon: "ph ph-chats-circle" },
    { v: "dash" as const, label: "Dashboard", icon: "ph ph-squares-four" },
    { v: "timeline" as const, label: "Timeline", icon: "ph ph-git-commit" },
    { v: "loop" as const, label: "Multi-agent loop", icon: "ph ph-arrows-clockwise" },
    { v: "library" as const, label: "Library", icon: "ph ph-books" },
    { v: "audit" as const, label: "Audit log", icon: "ph ph-scroll" },
  ];
  const navItems = navDefs.map((n) => ({
    label: n.label,
    icon: n.icon,
    color: s.view === n.v ? "var(--color-neutral-100)" : "var(--color-neutral-400)",
    bg: s.view === n.v ? "color-mix(in srgb,var(--color-accent) 24%,transparent)" : "transparent",
    shadow: s.view === n.v ? "inset 3px 0 0 var(--color-accent),0 0 16px color-mix(in srgb,var(--color-accent) 22%,transparent)" : "none",
    count: n.v === "audit" ? "2.1k" : "",
    onClick: () => a.switchView(n.v),
  }));

  const groupOrder = ["Today", "Yesterday"];
  const sessionGroups = groupOrder
    .map((label) => ({
      label,
      items: s.sessions
        .filter((x) => x.grp === label)
        .map((x) => ({
          title: x.title,
          dot: x.id === s.activeId ? "var(--color-accent)" : "var(--color-neutral-500)",
          bg: x.id === s.activeId ? "color-mix(in srgb,var(--color-accent) 16%,transparent)" : "transparent",
          shadow: x.id === s.activeId ? "inset 2px 0 0 var(--color-accent)" : "none",
          color: x.id === s.activeId ? "var(--color-neutral-100)" : "var(--color-neutral-300)",
          onClick: () => a.switchSession(x.id),
        })),
    }))
    .filter((g) => g.items.length);

  const models = chatModels.map((m) => ({
    name: m.name,
    sub: m.sub,
    dot: m.dot,
    active: m.id === s.modelId,
    bg: m.id === s.modelId ? "color-mix(in srgb,var(--color-accent) 12%,transparent)" : "transparent",
    onSelect: () => a.selectModel(m.id),
  }));

  // messages for active chat
  const curMsgs = s.msgs[s.activeId] || [];
  let tok = 0;
  const messages: MsgVM[] = curMsgs.map((m): MsgVM => {
    if (m.role === "user") {
      return {
        isUser: true,
        isAssistant: false,
        text: (m.blocks[0] || {}).text || "",
        hasFiles: !!(m.files && m.files.length),
        files: m.files || [],
      };
    }
    const meta = m.agentName
      ? { name: m.agentName, sub: "", icon: m.agentIcon || "ph ph-sparkle", dot: m.agentDot || "var(--color-accent)" }
      : agentMeta(m.agent || "");
    const blocks: BlockVM[] = (m.blocks || []).map((b): BlockVM => {
      if (b.type === "text") return { isText: true, text: b.text, streaming: !!b.streaming };
      if (b.type === "tool") return { isTool: true, name: b.name, detail: b.detail, status: b.status, lines: b.lines || [] };
      if (b.type === "code") return { isCode: true, file: b.file, code: b.code };
      if (b.type === "approval") {
        const st = b.status || "pending";
        const map = {
          pending: { statusLabel: "Pending", tagClass: "tag-outline", icon: "ph ph-shield-check", iconColor: "var(--color-accent)", borderColor: "var(--color-accent-700)" },
          approved: { statusLabel: "Approved", tagClass: "tag-accent", icon: "ph-fill ph-check-circle", iconColor: "var(--color-accent-300)", borderColor: "var(--color-accent-800)" },
          rejected: { statusLabel: "Rejected", tagClass: "tag-neutral", icon: "ph ph-x-circle", iconColor: "var(--color-neutral-400)", borderColor: "var(--color-neutral-800)" },
        }[st as "pending" | "approved" | "rejected"];
        return { isApproval: true, title: b.title, detail: b.detail, gate: b.gate, pending: st === "pending", ...map, onApprove: () => a.approve(s.activeId, b.id), onReject: () => a.reject(s.activeId, b.id) };
      }
      return {};
    });
    const cm = m.cost || "";
    tok += m.tokens || 0;
    return {
      isUser: false,
      isAssistant: true,
      agentName: meta.name,
      agentSub: meta.sub,
      agentIcon: meta.icon,
      agentBg: "color-mix(in srgb," + meta.dot + " 30%,var(--color-surface))",
      agentFg: meta.dot,
      agentGlow: "color-mix(in srgb," + meta.dot + " 38%,transparent)",
      cost: cm,
      blocks,
    };
  });
  const totalUsd = curMsgs.reduce((acc, m) => acc + (m.usd || 0), 0);

  // live event stream
  const liveOn = s.liveOn;
  const liveVals = {
    liveColor: liveOn ? "var(--color-accent-300)" : "var(--color-neutral-500)",
    liveDot: liveOn ? "var(--color-accent)" : "var(--color-neutral-600)",
    liveAnim: liveOn ? "ocpulse 1.4s ease-in-out infinite" : "none",
    liveLabel: liveOn ? "Live" : "Paused",
    liveIcon: liveOn ? "ph ph-pause" : "ph ph-play",
    liveBtn: liveOn ? "Pause" : "Resume",
    liveGlow: liveOn ? "0 0 10px var(--color-accent)" : "none",
  };
  const liveEvents = s.events.map((e) => ({ ...e, freshBg: e.fresh ? "color-mix(in srgb,var(--color-accent) 20%,transparent)" : "transparent" }));

  // library artifacts
  const artifacts = LIBRARY_ARTIFACTS.map((art) => ({ ...art, bg: "color-mix(in srgb," + art.fg + " 20%,var(--color-surface))" }));

  // settings
  const settingsDefs: { t: State["settingsTab"]; label: string; icon: string }[] = [
    { t: "prompt", label: "System prompt", icon: "ph ph-textbox" },
    { t: "tools", label: "Tools", icon: "ph ph-wrench" },
    { t: "plugins", label: "Plugins", icon: "ph ph-puzzle-piece" },
    { t: "mcp", label: "Connectors (MCP)", icon: "ph ph-plugs-connected" },
    { t: "risk", label: "Risk policy", icon: "ph ph-gauge" },
    { t: "memory", label: "Memory", icon: "ph ph-brain" },
    { t: "providers", label: "Providers", icon: "ph ph-stack" },
    { t: "appearance", label: "Appearance", icon: "ph ph-palette" },
  ];
  const settingsTabs = settingsDefs.map((d) => ({
    label: d.label,
    icon: d.icon,
    color: s.settingsTab === d.t ? "var(--color-neutral-100)" : "var(--color-neutral-400)",
    bg: s.settingsTab === d.t ? "color-mix(in srgb,var(--color-accent) 16%,transparent)" : "transparent",
    onClick: () => a.setSettingsTab(d.t),
  }));
  const toolDefs = [
    { k: "web", name: "Web search", desc: "Let agents search the live web", icon: "ph ph-globe" },
    { k: "code", name: "Code interpreter", desc: "Run code in a sandboxed container", icon: "ph ph-terminal-window" },
    { k: "files", name: "File search", desc: "Retrieve from the document library (pgvector)", icon: "ph ph-magnifying-glass" },
    { k: "github", name: "GitHub", desc: "Read repos, open commits and PRs", icon: "ph ph-git-branch" },
    { k: "coolify", name: "Deploy · Coolify", desc: "Trigger staging deploys — gated on approval", icon: "ph ph-rocket-launch" },
    { k: "terminal", name: "Terminal", desc: "Execute shell in a worker container", icon: "ph ph-terminal" },
    { k: "postgres", name: "Postgres query", desc: "Read projections and the event store", icon: "ph ph-database" },
  ];
  const toolsList = toolDefs.map((d) => {
    const on = !!s.tools[d.k];
    return {
      name: d.name,
      desc: d.desc,
      icon: d.icon,
      trackBg: on ? "var(--color-accent)" : "var(--color-neutral-800)",
      knobX: on ? "19px" : "3px",
      knobBg: on ? "#12141f" : "var(--color-neutral-400)",
      iconColor: on ? "var(--color-accent-300)" : "var(--color-neutral-500)",
      onToggle: () => a.toggleTool(d.k),
    };
  });
  const mcpList = s.mcp.map((m) => ({
    name: m.name,
    transport: m.transport,
    tools: m.tools + " tools",
    icon: m.icon,
    statusLabel: m.connected ? "Connected" : "Disconnected",
    tagClass: m.connected ? "tag-accent" : "tag-neutral",
    btnLabel: m.connected ? "Disconnect" : "Connect",
    btnClass: m.connected ? "btn-secondary" : "btn-primary",
    dotColor: m.connected ? "var(--color-accent)" : "var(--color-neutral-600)",
    onToggle: () => a.toggleMcp(m.id),
  }));
  const providersList = (chatModels.length ? chatModels : MODELS).map((m) => ({
    name: m.name,
    sub: m.sub,
    dot: m.dot,
    status: s.apiKey ? "Linked" : "No key",
    tagClass: s.apiKey ? "tag-accent" : "tag-neutral",
  }));

  // multi-agent loop
  const target = 92;
  const scoreColor = (v: number) => (v >= target ? "var(--color-accent)" : v >= 78 ? "var(--color-accent-400)" : "#d68f9a");
  const revealed = s.loopScript.slice(0, s.loopRevealed);
  const loopRounds = revealed.map((r, i) => {
    const am = agentMeta(r.author);
    const authorName = r.authorName || am.name;
    const authorIcon = r.authorIcon || am.icon;
    const authorFg = r.authorDot || am.dot;
    return {
      n: i + 1,
      showConnector: i < revealed.length - 1,
      authorName,
      authorIcon,
      authorFg,
      authorBg: "color-mix(in srgb," + authorFg + " 30%,var(--color-surface))",
      authorGlow: "color-mix(in srgb," + authorFg + " 38%,transparent)",
      draft: r.draft,
      score: r.score,
      scoreColor: scoreColor(r.score),
      reviews: r.reviews.map((rv) => {
        const rm = agentMeta(rv.agent);
        const name = rv.name || rm.name;
        const fg = rv.dot || rm.dot;
        return {
          name,
          icon: rv.icon || rm.icon,
          fg,
          bg: "color-mix(in srgb," + fg + " 30%,var(--color-surface))",
          glow: "color-mix(in srgb," + fg + " 38%,transparent)",
          score: rv.score,
          scoreColor: scoreColor(rv.score),
          note: rv.note,
          verdict: rv.score >= target ? "ph ph-check-circle" : "ph ph-arrow-bend-down-right",
          verdictColor: rv.score >= target ? "var(--color-accent)" : "var(--color-neutral-500)",
        };
      }),
    };
  });
  const loopScores = revealed.map((r) => ({ v: r.score, color: scoreColor(r.score) }));
  const bestScore = revealed.length ? revealed[revealed.length - 1].score : 0;
  const loopParticipants = [
    { role: "Author", name: "Claude Opus", icon: "ph ph-sparkle", dot: "var(--color-accent)" },
    { role: "Reviewer · correctness", name: "Claude Haiku", icon: "ph ph-scales", dot: "var(--color-accent-400)" },
    { role: "Reviewer · completeness", name: "Claude Haiku", icon: "ph ph-scales", dot: "var(--color-accent-400)" },
  ].map((p) => ({ role: p.role, name: p.name, icon: p.icon, dot: p.dot, bg: "color-mix(in srgb," + p.dot + " 30%,var(--color-surface))" }));
  const loopStatus = s.loopRunning ? "Running" : s.loopDone ? "Converged" : revealed.length ? "Stopped" : "Idle";

  // ── project + repo selectors ──
  const proj = PROJECTS.find((p) => p.id === s.projId) || PROJECTS[0];
  const repo = proj.repos.find((r) => r.id === s.repoId) || proj.repos[0];
  const repoDot = (st: string) => (st === "clean" ? "var(--color-accent)" : st === "ahead" ? "#d6c07a" : "#d68f9a");
  const projList = PROJECTS.map((p) => ({
    name: p.name,
    meta: p.meta,
    icon: p.icon,
    color: p.color,
    active: p.id === proj.id,
    iconBg: "color-mix(in srgb," + p.color + " 20%,transparent)",
    bg: p.id === proj.id ? "color-mix(in srgb,var(--color-accent) 14%,transparent)" : "transparent",
    textColor: p.id === proj.id ? "var(--color-neutral-100)" : "var(--color-neutral-300)",
    onClick: () => a.selectProj(p.id),
  }));
  const repoList = proj.repos.map((r) => ({
    name: r.name,
    meta: r.meta,
    branch: r.branch,
    dot: repoDot(r.state),
    bg: r.id === repo.id ? "color-mix(in srgb,var(--color-accent) 14%,transparent)" : "transparent",
    textColor: r.id === repo.id ? "var(--color-neutral-100)" : "var(--color-neutral-300)",
    onClick: () => a.selectRepo(r.id),
  }));

  // ── settings: plugins / guards / memory / appearance ──
  const knob = (on: boolean) => ({
    trackBg: on ? "var(--color-accent-600)" : "var(--color-neutral-800)",
    knobX: on ? "19px" : "3px",
    knobBg: on ? "var(--color-neutral-100)" : "var(--color-neutral-500)",
    iconColor: on ? "var(--color-accent-200)" : "var(--color-neutral-600)",
  });
  const pluginCats = [["all", "All"], ["workflow", "Workflow"], ["signals", "Signals"], ["guards", "Guards"]].map((c) => ({
    label: c[1],
    onClick: () => a.setPluginCat(c[0]),
    bg: s.pluginCat === c[0] ? "color-mix(in srgb,var(--color-accent) 20%,var(--color-surface))" : "transparent",
    color: s.pluginCat === c[0] ? "var(--color-neutral-100)" : "var(--color-neutral-500)",
  }));
  const pluginList = PLUGINS.filter((p) => s.pluginCat === "all" || p.cat === s.pluginCat).map((p) => {
    const on = !!s.plugins[p.id];
    const c = p.kind === "veto" ? "#d68f9a" : "var(--color-accent)";
    return {
      name: p.name,
      desc: p.desc,
      kind: p.kind,
      official: p.official,
      icon: p.icon,
      meta: p.meta,
      color: on ? c : "var(--color-neutral-500)",
      bg: "color-mix(in srgb," + (on ? c : "var(--color-neutral-500)") + " 18%,transparent)",
      border: on ? "color-mix(in srgb," + c + " 34%,transparent)" : "var(--color-divider)",
      tagClass: p.kind === "veto" ? "tag tag-accent-2" : "tag tag-neutral",
      perms: p.perms.map((pm) => ({ icon: pm[0], label: pm[1] })),
      onToggle: () => a.togglePlugin(p.id),
      ...knob(on),
    };
  });
  const guardDefs: [string, string, string, string][] = [
    ["budget", "Hard stop at the budget ceiling", "Refuse new turns instead of warning", "ph ph-gauge"],
    ["prodWrite", "Human signature on production writes", "No agent write executes unsigned", "ph ph-signature"],
    ["secrets", "Redact secrets from every prompt", "Scrubbed before the request leaves", "ph ph-key"],
    ["netEgress", "Block outbound network from tools", "Tools may read local context only", "ph ph-globe-x"],
  ];
  const guardList = guardDefs.map((g) => ({ name: g[1], desc: g[2], icon: g[3], onToggle: () => a.toggleGuard(g[0]), ...knob(!!s.guards[g[0]]) }));
  const memDefs: [string, string, string, string][] = [
    ["autoPrune", "Prune superseded notes automatically", "Archived, never hard-deleted", "ph ph-scissors"],
    ["contradiction", "Flag contradictions on write", "Blocks a note that conflicts with a verified claim", "ph ph-warning-diamond"],
    ["semantic", "Semantic recall across sessions", "pgvector search over every past turn", "ph ph-magnifying-glass"],
    ["forget", "Honor forget requests", "Removes a subject from the graph and the ledger", "ph ph-eraser"],
  ];
  const memList = memDefs.map((m) => ({ name: m[1], desc: m[2], icon: m[3], onToggle: () => a.toggleMem(m[0]), ...knob(!!s.mem[m[0]]) }));
  const appearDefs: [string, string, string, string][] = [
    ["glow", "Accent glow on active surfaces", "Turn off for a flatter, quieter chrome", "ph ph-sun-dim"],
    ["motion", "Streaming and reveal animations", "Respects your system reduced-motion setting", "ph ph-waveform"],
    ["mono", "Monospace agent output", "Code-first reading of every reply", "ph ph-text-aa"],
    ["thumbs", "Show artifact thumbnails in the library", "Off saves a request per card", "ph ph-images"],
  ];
  const appearList = appearDefs.map((ap) => ({ name: ap[1], desc: ap[2], icon: ap[3], onToggle: () => a.toggleAppear(ap[0]), ...knob(!!s.appear[ap[0]]) }));
  const densityOpts = [["compact", "Compact"], ["cozy", "Cozy"], ["roomy", "Roomy"]].map((d) => ({
    label: d[1],
    onClick: () => a.setDensity(d[0]),
    bg: s.density === d[0] ? "color-mix(in srgb,var(--color-accent) 20%,transparent)" : "transparent",
    color: s.density === d[0] ? "var(--color-neutral-100)" : "var(--color-neutral-500)",
  }));
  const capActions = [["pause", "Pause"], ["cheap", "Downgrade"], ["ask", "Ask me"]].map((c) => ({
    label: c[1],
    onClick: () => a.setCapAction(c[0]),
    bg: s.capAction === c[0] ? "color-mix(in srgb,var(--color-accent) 20%,transparent)" : "transparent",
    color: s.capAction === c[0] ? "var(--color-neutral-100)" : "var(--color-neutral-500)",
  }));
  const capActionNote =
    s.capAction === "pause"
      ? "New turns are refused until you raise the ceiling."
      : s.capAction === "cheap"
        ? "Routing drops to the cheapest model that still clears review."
        : "The Hub stops and asks before every further turn.";

  // ── stakes dial ──
  const stake = STAKES.find((x) => x.id === s.stake) || STAKES[2];
  const stakeColor = stake.tone === "hot" ? "#d68f9a" : stake.tone === "warn" ? "#d6c07a" : "var(--color-accent)";
  const stakeOpts = STAKES.map((o) => {
    const on = o.id === s.stake;
    const c = o.tone === "hot" ? "#d68f9a" : o.tone === "warn" ? "#d6c07a" : "var(--color-accent)";
    return {
      label: o.label,
      sub: o.sub,
      onClick: () => a.setStake(o.id),
      bg: on ? "color-mix(in srgb," + c + " 20%,var(--color-surface))" : "transparent",
      color: on ? "var(--color-neutral-100)" : "var(--color-neutral-500)",
      shadow: on ? "inset 0 0 0 1px " + c + ",0 0 16px color-mix(in srgb," + c + " 22%,transparent)" : "none",
    };
  });
  const stakePolicy = stake.policy.map((p) => ({ k: p[0], v: p[1], note: p[2] }));

  // ── spend chart (real spend when the backend has data) ──
  const spendSource: [string, number, number][] = dash ? dash.spendDays.map((x) => [x.day, x.spend, 0]) : SPEND;
  const spendMax = Math.max(...spendSource.map((d) => d[1] + d[2]), 0.0001);
  const spendDays = spendSource.map((d, i) => {
    const tot = d[1] + d[2];
    return {
      day: d[0],
      amt: tot >= 0.01 ? "$" + tot.toFixed(2) : tot > 0 ? "$" + tot.toFixed(4) : "—",
      h: Math.max((tot / spendMax) * 100, tot > 0 ? 6 : 2) + "%",
      reworkH: d[2] > 0 ? (d[2] / tot) * 100 + "%" : "0%",
      radius: d[2] > 0 ? "0 0 4px 4px" : "4px",
      labelColor: i === spendSource.length - 1 ? "var(--color-accent-200)" : "var(--color-neutral-600)",
    };
  });
  const spendTotal = "$" + spendSource.reduce((acc, d) => acc + d[1] + d[2], 0).toFixed(2);

  // ── attention panel ──
  const attention = [
    { label: "Stale claims below threshold", sub: "confidence has decayed past 60%", n: CLAIMS.filter((c) => (s.claimConf[c.id] ?? c.conf) < 60).length, icon: "ph-fill ph-warning-circle", color: "#d68f9a", v: "truth" as const },
    { label: "Open blind spots", sub: "gaps agents keep filling with guesses", n: BLIND_SPOTS.length - BLIND_SPOTS.filter((b) => s.closedSpots[b.id]).length, icon: "ph ph-question", color: "#d6c07a", v: "blind" as const },
    { label: "Nightshift items awaiting approval", sub: "drafted, not executed", n: s.nightReal.filter((f) => f.kind === "drafted").length, icon: "ph ph-moon-stars", color: "var(--color-accent)", v: "night" as const },
    { label: "Decisions with high regret", sub: "confident calls that did not hold", n: REGRET_ROWS.filter((r) => r.good === false).length, icon: "ph ph-scales", color: "#d68f9a", v: "regret" as const },
  ].map((at) => ({ ...at, bg: "color-mix(in srgb," + at.color + " 18%,transparent)", onClick: () => a.switchView(at.v) }));

  // ── regret index ──
  const regretAgents = REGRET_AGENTS.map((ag) => {
    const color = ag.pct < 15 ? "var(--color-accent)" : ag.pct < 30 ? "#d6c07a" : "#d68f9a";
    return {
      name: ag.name,
      icon: ag.icon,
      regret: ag.regret,
      note: ag.note,
      color,
      bar: Math.min(ag.pct * 2, 100) + "%",
      bg: "color-mix(in srgb," + color + " 20%,transparent)",
      border: ag.pct >= 30 ? "color-mix(in srgb,#d68f9a 32%,transparent)" : "var(--color-divider)",
    };
  });
  const regretRows = REGRET_ROWS.map((r) => {
    const color = r.good === true ? "var(--color-accent)" : r.good === null ? "#d6c07a" : "#d68f9a";
    return {
      decision: r.decision,
      by: r.by,
      when: r.when,
      claimed: r.claimed,
      actual: r.actual,
      conf: r.conf,
      outcome: r.outcome,
      gap: r.gap,
      color,
      icon: r.good === true ? "ph-fill ph-check-circle" : r.good === null ? "ph ph-scales" : "ph-fill ph-x-circle",
      border: r.good === false ? "color-mix(in srgb,#d68f9a 28%,transparent)" : "var(--color-divider)",
    };
  });

  // ── negotiation room ──
  const negTurns = NEG_TURNS.slice(0, s.negRevealed).map((t) => {
    const isA = t.side === "a";
    return {
      name: t.name,
      role: t.role,
      icon: t.icon,
      says: t.says,
      wants: t.wants,
      gives: t.gives,
      justify: isA ? "flex-start" : "flex-end",
      align: isA ? "flex-start" : "flex-end",
      dir: isA ? "row" : "row-reverse",
      color: isA ? "var(--color-accent)" : "var(--color-neutral-300)",
      bg: isA ? "color-mix(in srgb,var(--color-accent) 22%,transparent)" : "var(--color-neutral-800)",
      glow: isA ? "color-mix(in srgb,var(--color-accent) 26%,transparent)" : "transparent",
      bubble: isA ? "linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 13%,var(--color-surface)),var(--color-surface))" : "var(--color-surface)",
      border: isA ? "var(--color-accent-600)" : "var(--color-divider)",
    };
  });
  const negStatus = s.negRunning
    ? "trading concessions…"
    : s.negDeal
      ? "settled — terms below, awaiting your acceptance"
      : "4 scoring rounds, no convergence — scores moved less than 1 point";

  // ── blind spot map ──
  const blindSpots = BLIND_SPOTS.map((b) => {
    const closed = !!s.closedSpots[b.id];
    const color = closed ? "var(--color-neutral-500)" : b.sev >= 75 ? "#d68f9a" : b.sev >= 50 ? "#d6c07a" : "var(--color-neutral-400)";
    return {
      q: b.q,
      area: b.area,
      assumed: b.assumed,
      hits: b.hits,
      rides: b.rides,
      color,
      bar: b.sev + "%",
      op: closed ? "0.5" : "1",
      strike: closed ? "text-decoration:line-through;color:var(--color-neutral-600)" : "",
      icon: closed ? "ph-fill ph-check-circle" : b.sev >= 75 ? "ph-fill ph-warning-octagon" : "ph ph-question",
      bg: "color-mix(in srgb," + color + " 18%,transparent)",
      surface: closed ? "transparent" : "var(--color-surface)",
      border: closed ? "var(--color-divider)" : b.sev >= 75 ? "color-mix(in srgb,#d68f9a 30%,transparent)" : "var(--color-divider)",
      tagClass: b.areaTone === "warn" && !closed ? "tag tag-accent" : "tag tag-neutral",
      btnLabel: closed ? "Reopen" : "Answer this",
      btnIcon: closed ? "ph ph-arrow-counter-clockwise" : "ph ph-pencil-simple",
      onClose: () => a.closeSpot(b.id),
    };
  });
  const blindClosedN = BLIND_SPOTS.filter((b) => s.closedSpots[b.id]).length;

  // ── truth decay ──
  const claims = CLAIMS.map((c) => {
    const conf = s.claimConf[c.id] ?? c.conf;
    const chk = !!s.checking[c.id];
    const color = conf >= 80 ? "var(--color-accent)" : conf >= 55 ? "#d6c07a" : "#d68f9a";
    return {
      text: c.text,
      source: c.source,
      srcIcon: c.srcIcon,
      half: c.half,
      age: s.claimAge[c.id] ?? c.age,
      conf: conf + "%",
      color,
      border: conf < 55 ? "color-mix(in srgb,#d68f9a 34%,transparent)" : "var(--color-divider)",
      icon: conf >= 80 ? "ph-fill ph-seal-check" : conf >= 55 ? "ph ph-hourglass-medium" : "ph-fill ph-warning-circle",
      status: chk ? "checking" : conf >= 80 ? "verified" : conf >= 55 ? "aging" : "stale",
      btnLabel: chk ? "Checking…" : "Re-verify",
      btnIcon: chk ? "ph ph-circle-notch" : "ph ph-arrows-counter-clockwise",
      spin: chk ? "animation:ocspin 1s linear infinite" : "",
      onReverify: () => a.reverify(c.id),
    };
  });
  const confs = CLAIMS.map((c) => s.claimConf[c.id] ?? c.conf);
  const truthAvg = Math.round(confs.reduce((x, y) => x + y, 0) / confs.length) + "%";
  const truthStale = confs.filter((x) => x < 60).length;

  // ── nightshift (real Claude-generated brief from the event log) ──
  const nightIcon = (kind: string) =>
    kind === "answered" ? "ph ph-check-circle" : kind === "pruned" ? "ph ph-scissors" : kind === "drafted" ? "ph ph-pencil-simple" : "ph ph-eye";
  const nightRealFindings = s.nightReal.slice(0, s.nightRevealed).map((f) => ({
    title: f.title,
    body: f.body,
    kind: f.kind,
    at: "tonight",
    icon: nightIcon(f.kind),
    needsApproval: f.kind === "drafted",
    color: f.kind === "watch" ? "#d6c07a" : "var(--color-accent)",
    bg: f.kind === "watch" ? "color-mix(in srgb,#d6c07a 18%,transparent)" : "color-mix(in srgb,var(--color-accent) 20%,transparent)",
    border: f.kind === "drafted" ? "var(--color-accent-500)" : "var(--color-divider)",
    glow: f.kind === "drafted" ? "0 0 20px color-mix(in srgb,var(--color-accent) 14%,transparent)" : "none",
    tagClass: f.kind === "watch" ? "tag tag-neutral" : "tag tag-accent",
  }));
  const nightFindings = nightRealFindings;
  const nightDrafted = s.nightReal.filter((f) => f.kind === "drafted").length;
  const nightStatus = s.nightRunning
    ? "shift in progress — Claude is reviewing tonight's event log"
    : s.nightError
      ? s.nightError
      : s.nightReal.length > 0
        ? nightDrafted + " drafted item(s) awaiting approval · " + s.nightReal.length + " finding(s) filed"
        : "idle — run a shift to have Claude review the recent event log";

  // ── lab nav + presence + budget ──
  const labDefs = [
    { v: "graph" as const, label: "Memory graph", icon: "ph ph-share-network" },
    { v: "branches" as const, label: "Agent branches", icon: "ph ph-git-branch" },
    { v: "replay" as const, label: "Model replay", icon: "ph ph-clock-clockwise" },
    { v: "market" as const, label: "Agent market", icon: "ph ph-trophy" },
    { v: "recovery" as const, label: "Auto-recovery", icon: "ph ph-heartbeat" },
    { v: "counter" as const, label: "Counterfactual", icon: "ph ph-flow-arrow" },
    { v: "truth" as const, label: "Truth decay", icon: "ph ph-hourglass-medium" },
    { v: "regret" as const, label: "Regret index", icon: "ph ph-scales" },
    { v: "negotiate" as const, label: "Negotiation room", icon: "ph ph-handshake" },
    { v: "blind" as const, label: "Blind spot map", icon: "ph ph-question" },
    { v: "night" as const, label: "Nightshift", icon: "ph ph-moon-stars" },
  ];
  const labItems = labDefs.map((n) => ({
    label: n.label,
    icon: n.icon,
    badge: "",
    color: s.view === n.v ? "var(--color-neutral-100)" : "var(--color-neutral-400)",
    bg: s.view === n.v ? "color-mix(in srgb,var(--color-accent) 24%,transparent)" : "transparent",
    shadow: s.view === n.v ? "inset 3px 0 0 var(--color-accent),0 0 16px color-mix(in srgb,var(--color-accent) 22%,transparent)" : "none",
    onClick: () => a.switchView(n.v),
  }));
  const presence = ["forge", "claude", "hermes"].map((id) => {
    const m = agentMeta(id);
    return { name: m.name, icon: m.icon, dot: m.dot, bg: "color-mix(in srgb," + m.dot + " 30%,var(--color-surface))" };
  });
  const spendNum = dash ? dash.spend : 0;
  const bratio = Math.min(spendNum / 50, 1);
  const budgetHot = bratio >= 0.9 ? "#d68f9a" : "var(--color-accent)";

  // ── command palette ──
  const palAll = [
    ...navDefs.map((n) => ({ label: "Go to " + n.label, icon: n.icon, kind: "view", run: () => a.switchView(n.v) })),
    ...labDefs.map((n) => ({ label: "Go to " + n.label, icon: n.icon, kind: "lab", run: () => a.switchView(n.v) })),
    { label: "New chat", icon: "ph ph-plus", kind: "action", run: () => a.newChat() },
    ...PROJECTS.filter((p) => p.id !== s.projId).map((p) => ({ label: "Switch to " + p.name, icon: p.icon, kind: "project", run: () => a.selectProj(p.id) })),
    ...(PROJECTS.find((p) => p.id === s.projId) || PROJECTS[0]).repos
      .filter((r) => r.id !== s.repoId)
      .map((r) => ({ label: "Scope agents to " + r.name, icon: "ph ph-git-branch", kind: "repo", run: () => a.selectRepo(r.id) })),
    { label: "Run a nightshift", icon: "ph ph-moon-stars", kind: "action", run: () => { a.switchView("night"); a.runNight(); } },
    { label: "Settle a deadlock by negotiation", icon: "ph ph-handshake", kind: "action", run: () => { a.switchView("negotiate"); a.runNeg(); } },
    { label: "Raise stakes to production", icon: "ph ph-gauge", kind: "action", run: () => { a.switchView("dash"); a.setStake("money"); } },
    { label: "Re-verify stale claims", icon: "ph ph-hourglass-medium", kind: "action", run: () => { a.switchView("truth"); a.reverifyAll(); } },
    { label: "Run multi-agent loop", icon: "ph ph-arrows-clockwise", kind: "action", run: () => { a.switchView("loop"); a.runLoop(); } },
    { label: "Run autonomous recovery", icon: "ph ph-heartbeat", kind: "action", run: () => { a.switchView("recovery"); a.runRecovery(); } },
    { label: "Replay a decision", icon: "ph ph-clock-clockwise", kind: "action", run: () => a.switchView("replay") },
    { label: "Toggle time travel", icon: "ph ph-clock-counter-clockwise", kind: "action", run: () => a.toggleTimeTravel() },
    { label: "Open settings", icon: "ph ph-gear-six", kind: "action", run: () => a.openSettings() },
  ];
  const q = s.paletteQuery.toLowerCase();
  const paletteItems = palAll
    .filter((p) => p.label.toLowerCase().includes(q))
    .map((p) => ({ label: p.label, icon: p.icon, kind: p.kind, onRun: () => { a.closePalette(); p.run(); } }));

  // ── time travel ──
  const ttLabel = s.ttPos >= 100 ? "now · 21:41" : s.ttPos >= 74 ? "21:14 · deploy 37" : s.ttPos >= 48 ? "20:58 · PRD imported" : s.ttPos >= 22 ? "Jan 2026 · kickoff" : "project start";
  const ttEvents = Math.round(2100 * (s.ttPos / 100));

  // ── memory graph ──
  const nodeById: Record<string, (typeof GN)[number]> = {};
  GN.forEach((n) => (nodeById[n.id] = n));
  const gsel = s.graphSel;
  const hidden = s.graphHidden || {};
  const depth = s.graphDepth ?? 2;
  const neighbors = (id: string) => EDGES.filter((e) => e[0] === id || e[1] === id).map((e) => (e[0] === id ? e[1] : e[0]));
  const reach = new Set<string>([gsel]);
  for (let d = 0; d < depth; d++) {
    const add: string[] = [];
    reach.forEach((id) => neighbors(id).forEach((n) => add.push(n)));
    add.forEach((n) => reach.add(n));
  }
  const visible = (id: string) => !hidden[nodeById[id].type];
  const graphNodes = GN.filter((n) => visible(n.id)).map((n) => {
    const on = n.id === gsel;
    const near = reach.has(n.id);
    const c = GTYPES[n.type].color;
    return {
      x: n.x,
      y: n.y,
      r: n.r,
      label: n.label,
      sub: n.sub,
      glyph: n.glyph,
      leftPct: (n.x / 620) * 100 + "%",
      topPct: (n.y / 430) * 100 + "%",
      labelTopPct: ((n.y + n.r + 5) / 430) * 100 + "%",
      iconFill: on ? "var(--color-bg)" : c,
      op: near ? "1" : "0.32",
      halo: on,
      haloR: n.r + 9,
      haloFill: "color-mix(in srgb," + c + " 22%,transparent)",
      fill: on ? c : "color-mix(in srgb," + c + " 15%,var(--color-surface))",
      stroke: on ? c : n.type === "gap" ? "#d68f9a" : "color-mix(in srgb," + c + " 55%,transparent)",
      sw: on ? 3 : 1.5,
      textFill: on ? "var(--color-neutral-100)" : "var(--color-neutral-400)",
      onClick: () => a.selectGraphNode(n.id),
    };
  });
  const graphEdges = EDGES.filter(([x, y]) => visible(x) && visible(y)).map(([x, y, label, dashed]) => {
    const na = nodeById[x];
    const nb = nodeById[y];
    const hot = x === gsel || y === gsel;
    return {
      x1: na.x,
      y1: na.y,
      x2: nb.x,
      y2: nb.y,
      lx: (((na.x + nb.x) / 2) / 620) * 100 + "%",
      lyPct: (((na.y + nb.y) / 2) / 430) * 100 + "%",
      label: hot ? label : "",
      labelFill: "var(--color-accent-200)",
      stroke: dashed ? (hot ? "#d68f9a" : "color-mix(in srgb,#d68f9a 45%,transparent)") : hot ? "var(--color-accent-400)" : "var(--color-divider)",
      w: hot ? 2 : 1,
      dash: dashed ? "4 4" : "0",
    };
  });
  const graphFilters = Object.keys(GTYPES).map((t) => {
    const off = !!hidden[t];
    return {
      label: GTYPES[t].label,
      dot: GTYPES[t].color,
      n: GN.filter((n) => n.type === t).length,
      onClick: () => a.toggleGraphType(t),
      bg: off ? "transparent" : "color-mix(in srgb," + GTYPES[t].color + " 14%,var(--color-surface))",
      border: off ? "var(--color-divider)" : "color-mix(in srgb," + GTYPES[t].color + " 45%,transparent)",
      color: off ? "var(--color-neutral-600)" : "var(--color-neutral-200)",
    };
  });
  const gd = GDET[gsel] || GDET.decision;
  const gsNode = nodeById[gsel] || nodeById.decision;
  const gsColor = GTYPES[gsNode.type].color;
  const selStats = gd.stats.map((x) => ({ v: x[0], k: x[1] }));
  const selProv = gd.prov.map((x) => ({ icon: x[0], label: x[1], meta: x[2] }));
  const graphSelLinks = gd.links.map((x) => ({ icon: x[0], label: x[1], rel: x[2], onClick: () => a.selectGraphNode(x[3]) }));
  const graphHealth = [
    { label: "Nodes / edges", v: GN.length + " / " + EDGES.length, icon: "ph ph-share-network", color: "var(--color-neutral-300)" },
    { label: "Unsupported assumptions", v: String(EDGES.filter((e) => e[3]).length), icon: "ph ph-warning-octagon", color: "#d68f9a" },
    { label: "Orphan nodes", v: "0", icon: "ph ph-circle-dashed", color: "var(--color-accent)" },
    { label: "Mean claim confidence", v: truthAvg, icon: "ph ph-hourglass-medium", color: "var(--color-accent)" },
  ];
  const gqPath = GQ.path.map((p, i) => ({
    label: p[0],
    icon: "ph ph-circle-half",
    color: GTYPES[nodeById[p[1]].type].color,
    bg: "color-mix(in srgb," + GTYPES[nodeById[p[1]].type].color + " 13%,var(--color-surface))",
    border: "color-mix(in srgb," + GTYPES[nodeById[p[1]].type].color + " 40%,transparent)",
    arrow: i < GQ.path.length - 1,
  }));

  // ── agent branches (real: three Claude personas draft candidate approaches) ──
  const mcolor = (t: string) => (t === "good" ? "var(--color-accent-300)" : t === "warn" ? "#d6bd8f" : t === "bad" ? "#d68f9a" : "var(--color-neutral-200)");
  const hasRealBranches = s.branchReal.length > 0;
  const minBranchCost = hasRealBranches ? Math.min(...s.branchReal.map((b) => b.cost)) : 0;
  const maxBranchCost = hasRealBranches ? Math.max(...s.branchReal.map((b) => b.cost)) : 0;
  const effortTone = (e: string) => (e === "S" ? "good" : e === "L" ? "warn" : "");
  const riskTone = (r: string) => (r === "Low" ? "good" : r === "High" ? "bad" : "warn");
  const branches = hasRealBranches
    ? s.branchReal.map((b) => {
        const isM = s.mergedBranch === b.id;
        const costTone = b.cost <= minBranchCost ? "good" : b.cost >= maxBranchCost && maxBranchCost > minBranchCost ? "warn" : "";
        return {
          letter: b.letter,
          title: b.title,
          agent: b.persona,
          agentIcon: b.personaIcon,
          recommended: b.recommended,
          summary: b.summary,
          border: b.recommended ? "var(--color-accent-500)" : "var(--color-divider)",
          badgeBg: b.recommended ? "var(--color-accent)" : "var(--color-neutral-800)",
          badgeFg: b.recommended ? "#0a0c14" : "var(--color-neutral-200)",
          metrics: [
            { k: "Effort", v: b.effort === "S" ? "Small" : b.effort === "L" ? "Large" : "Medium", color: mcolor(effortTone(b.effort)) },
            { k: "Risk", v: b.risk, color: mcolor(riskTone(b.risk)) },
            { k: "Draft cost", v: "$" + b.cost.toFixed(4), color: mcolor(costTone) },
          ],
          btnClass: isM ? "btn-secondary" : b.recommended ? "btn-primary" : "btn-secondary",
          btnIcon: isM ? "ph ph-check" : "ph ph-git-merge",
          btnLabel: isM ? "Merged" : "Merge this",
          onMerge: () => a.mergeBranch(b.id),
        };
      })
    : BRANCHES.map((b) => {
        const isM = s.mergedBranch === b.id;
        return {
          letter: b.letter,
          title: b.title,
          agent: b.agent,
          agentIcon: b.agentIcon,
          recommended: b.recommended,
          summary: "",
          border: b.recommended ? "var(--color-accent-500)" : "var(--color-divider)",
          badgeBg: b.recommended ? "var(--color-accent)" : "var(--color-neutral-800)",
          badgeFg: b.recommended ? "#0a0c14" : "var(--color-neutral-200)",
          metrics: b.metrics.map(([k, v, t]) => ({ k, v, color: mcolor(t) })),
          btnClass: isM ? "btn-secondary" : b.recommended ? "btn-primary" : "btn-secondary",
          btnIcon: isM ? "ph ph-check" : "ph ph-git-merge",
          btnLabel: isM ? "Merged" : "Merge this",
          onMerge: () => a.mergeBranch(b.id),
        };
      });

  // ── agent market ──
  const marketCats = ["Coding", "Research", "Deploy", "Summarize"].map((c) => ({
    label: c,
    onSelect: () => a.setMarketCat(c),
    bg: c === s.marketCat ? "color-mix(in srgb,var(--color-accent) 22%,transparent)" : "transparent",
    color: c === s.marketCat ? "var(--color-accent-300)" : "var(--color-neutral-400)",
    border: c === s.marketCat ? "var(--color-accent-500)" : "var(--color-divider)",
  }));
  const marketRows = (MARKET[s.marketCat] || []).map((r, i) => {
    const m = agentMeta(r[4]);
    return {
      rank: i + 1,
      rankIcon: i === 0 ? "ph-fill ph-crown" : "ph ph-circle",
      rankColor: i === 0 ? "var(--color-accent)" : "var(--color-neutral-600)",
      name: r[0],
      dot: m.dot,
      success: r[1],
      cost: r[2],
      latency: r[3],
      btnClass: i === 0 ? "btn-primary" : "btn-secondary",
      btnLabel: i === 0 ? "Route here" : "Route",
    };
  });

  // ── auto-recovery ──
  const completed = s.recStep;
  const recSteps = RECOVERY_STEPS.map((r, i) => {
    const idx = i + 1;
    const isDone = idx <= completed;
    const isActive = s.recRunning && idx === completed + 1;
    return {
      label: r.label,
      detail: r.detail,
      icon: isDone ? "ph ph-check" : isActive ? "ph ph-circle-notch" : "ph ph-circle",
      spin: isActive ? "animation:ocspin 1s linear infinite" : "",
      ring: isDone ? "var(--color-accent)" : isActive ? "var(--color-accent-400)" : "var(--color-neutral-700)",
      iconColor: isDone ? "var(--color-accent)" : isActive ? "var(--color-accent-300)" : "var(--color-neutral-600)",
      textColor: !isDone && !isActive ? "var(--color-neutral-500)" : "var(--color-neutral-200)",
      tagColor: isDone || isActive ? "var(--color-accent-300)" : "var(--color-neutral-700)",
      status: isDone ? "done" : isActive ? "running" : "queued",
    };
  });

  // ── model replay (real): cost comparison between original and replayed turn ──
  let replayCostDelta = "";
  if (s.replayDone && s.replayOrig && s.replayNew) {
    const o = s.replayOrig.cost;
    const n = s.replayNew.cost;
    if (o > 0 && n > 0) {
      const ratio = o / n;
      replayCostDelta = ratio >= 1.05 ? ratio.toFixed(1) + "× cheaper" : n / o >= 1.05 ? (n / o).toFixed(1) + "× pricier" : "about the same cost";
    } else if (n > 0) {
      replayCostDelta = "$" + n.toFixed(4) + " this run";
    } else {
      replayCostDelta = "no cost recorded";
    }
  }

  // ── counterfactual ──
  const cfMetrics = CF_METRICS.map((m) => ({
    k: m.k,
    baseV: m.base,
    altV: m.alt,
    baseW: m.baseW,
    altW: m.altW,
    delta: m.delta,
    deltaColor: m.good ? "var(--color-accent-300)" : "#d6bd8f",
  }));

  return {
    // loop
    isLoop: s.view === "loop",
    loopTask: s.loopTask,
    loopTarget: target,
    loopParticipants,
    loopRounds,
    loopScores,
    hasLoop: revealed.length > 0,
    loopEmpty: revealed.length === 0,
    loopDone: s.loopDone,
    loopError: s.loopError,
    bestScore,
    roundCount: revealed.length,
    loopStatus,
    runLabel: s.loopRunning ? "Running…" : s.loopDone || revealed.length ? "Run again" : "Run loop",
    loopStatusColor: s.loopRunning ? "var(--color-accent-300)" : s.loopDone ? "var(--color-accent)" : "var(--color-neutral-500)",
    loopStatusIcon: s.loopRunning ? "ph ph-circle-notch" : s.loopDone ? "ph ph-check-circle" : "ph ph-pause-circle",
    loopSpin: s.loopRunning ? "animation:ocspin 1s linear infinite" : "",
    runLoop: () => a.runLoop(),
    resetLoop: () => a.resetLoop(),
    improveMore: () => a.improveMore(),
    onLoopTask: (e: React.ChangeEvent<HTMLInputElement>) => a.setLoopTask(e.target.value),

    // lab views + global features
    isGraph: s.view === "graph",
    isBranches: s.view === "branches",
    isReplay: s.view === "replay",
    isMarket: s.view === "market",
    isRecovery: s.view === "recovery",
    isCounter: s.view === "counter",
    isTruth: s.view === "truth",
    isNight: s.view === "night",
    isRegret: s.view === "regret",
    isNegotiate: s.view === "negotiate",
    isBlind: s.view === "blind",
    stakeOpts,
    stakePolicy,
    stakeName: stake.label,
    stakeCost: stake.cost,
    stakeEffect: stake.effect,
    stakeEffectIcon: stake.effectIcon,
    stakeColor,
    stakeBorder: "color-mix(in srgb," + stakeColor + " 42%,transparent)",
    stakeGlow: "color-mix(in srgb," + stakeColor + " 13%,transparent)",
    stakeTagClass: stake.tone === "calm" ? "tag tag-neutral" : "tag tag-accent",
    goSettings: () => a.openSettings(),
    spendDays,
    spendTotal,
    spendTrend: "31% above trend",
    attention,
    regretAgents,
    regretRows,
    negTurns,
    negStatus,
    negAny: s.negRevealed > 0,
    negEmpty: s.negRevealed === 0,
    negDeal: s.negDeal,
    runNeg: () => a.runNeg(),
    negBtnLabel: s.negRunning ? "Trading…" : s.negDeal ? "Run again" : "Open the room",
    negBtnIcon: s.negRunning ? "ph ph-circle-notch" : "ph ph-door-open",
    negSpin: s.negRunning ? "animation:ocspin 1s linear infinite" : "",
    blindSpots,
    blindOpen: BLIND_SPOTS.length - blindClosedN,
    blindGuesses: 38,
    blindClosed: blindClosedN,
    claims,
    truthAvg,
    truthStale,
    reverifyAll: () => a.reverifyAll(),
    runNight: () => a.runNight(),
    nightFindings,
    nightError: s.nightError,
    nightAny: s.nightRevealed > 0,
    nightEmpty: s.nightRevealed === 0 && !s.nightError,
    nightBudget: "$4.00",
    nightStatus,
    nightBtnLabel: s.nightRunning ? "Working…" : s.nightRevealed > 0 ? "Run again" : "Run a shift",
    nightBtnIcon: s.nightRunning ? "ph ph-circle-notch" : "ph ph-play",
    nightSpin: s.nightRunning ? "animation:ocspin 1s linear infinite" : "",
    labItems,
    presence,
    budgetSpent: "$" + spendNum.toFixed(spendNum >= 0.01 || spendNum === 0 ? 2 : 4),
    budgetCap: "$50.00",
    budgetPct: (bratio * 100).toFixed(0) + "%",
    budgetColor: budgetHot,
    budgetBar: bratio >= 0.9 ? "linear-gradient(90deg,#c68,#d68f9a)" : "linear-gradient(90deg,var(--color-accent-600),var(--color-accent-400))",
    budgetGlow: "color-mix(in srgb," + budgetHot + " 40%,transparent)",
    ttColor: s.timeTravel ? "var(--color-accent)" : "var(--color-neutral-500)",
    openPalette: () => a.openPalette(),
    closePalette: () => a.closePalette(),
    paletteOpen: s.paletteOpen,
    paletteQuery: s.paletteQuery,
    paletteItems,
    paletteEmpty: paletteItems.length === 0,
    setPaletteRef: (el: HTMLInputElement | null) => a.setPaletteRef(el),
    onPaletteQuery: (e: React.ChangeEvent<HTMLInputElement>) => a.setPaletteQuery(e.target.value),
    timeTravel: s.timeTravel,
    toggleTimeTravel: () => a.toggleTimeTravel(),
    ttPos: s.ttPos,
    onTtPos: (e: React.ChangeEvent<HTMLInputElement>) => a.setTtPos(parseInt(e.target.value)),
    ttLabel,
    ttEvents,
    projName: proj.name,
    projIcon: proj.icon,
    projColor: proj.color,
    projBg: "color-mix(in srgb," + proj.color + " 20%,transparent)",
    projOpen: s.projOpen,
    repoOpen: s.repoOpen,
    toggleProj: () => a.toggleProj(),
    toggleRepo: () => a.toggleRepo(),
    projCaret: s.projOpen ? "ph ph-caret-up" : "ph ph-caret-down",
    repoCaret: s.repoOpen ? "ph ph-caret-up" : "ph ph-caret-down",
    projList,
    repoList,
    repoName: repo.name,
    repoBranch: repo.branch,
    repoSyncColor: repoDot(repo.state),
    graphNodes,
    graphEdges,
    graphFilters,
    graphSelLinks,
    graphHealth,
    selStats,
    selProv,
    graphSelType: gd.type,
    graphSelTitle: gd.title,
    graphSelNote: gd.note,
    selIcon:
      gsNode.type === "gap"
        ? "ph-fill ph-warning-octagon"
        : gsNode.type === "decision"
          ? "ph ph-git-fork"
          : gsNode.type === "agent"
            ? "ph ph-hammer"
            : gsNode.type === "req"
              ? "ph ph-file-text"
              : gsNode.type === "constraint"
                ? "ph ph-coins"
                : gsNode.type === "cost"
                  ? "ph ph-currency-dollar"
                  : "ph ph-database",
    selColor: gsColor,
    selBg: "color-mix(in srgb," + gsColor + " 20%,transparent)",
    selConf: gsNode.conf + "% conf",
    selTagClass: gsNode.conf < 50 ? "tag tag-accent-2" : "tag tag-neutral",
    graphCount: graphNodes.length + " of " + GN.length + " nodes shown",
    depthVal: s.graphDepth,
    onDepth: (e: React.ChangeEvent<HTMLInputElement>) => a.setGraphDepth(parseInt(e.target.value)),
    gqValue: s.gqValue,
    onGq: (e: React.ChangeEvent<HTMLInputElement>) => a.setGqValue(e.target.value),
    runGq: () => a.runGq(),
    gqAnswered: s.gqAnswered,
    gqBtnIcon: s.gqRunning ? "ph ph-circle-notch" : "ph ph-path",
    gqSpin: s.gqRunning ? "animation:ocspin 1s linear infinite" : "",
    gqTitle: GQ.title,
    gqHops: GQ.hops,
    gqAnswer: GQ.answer,
    gqPath,
    askWhy: () => a.runGq(),
    goRiskTab: () => { a.switchView("settings"); a.setSettingsTab("risk"); },
    stakeSummary: stake.policy[1][1] + " reviewer(s) · " + stake.policy[2][1].toLowerCase() + " gated · " + stake.policy[0][1],
    branches,
    branchTask: s.branchTask,
    onBranchTask: (e: React.ChangeEvent<HTMLInputElement>) => a.setBranchTask(e.target.value),
    runBranches: () => a.runBranches(),
    branchError: s.branchError,
    branchHasReal: hasRealBranches,
    branchRationale: s.branchRationale,
    branchEmpty: !hasRealBranches && !s.branchError,
    branchBtnLabel: s.branchRunning ? "Forking…" : hasRealBranches ? "Fork again" : "Fork branches",
    branchBtnIcon: s.branchRunning ? "ph ph-circle-notch" : "ph ph-git-branch",
    branchSpin: s.branchRunning ? "animation:ocspin 1s linear infinite" : "",
    runReplay: () => a.runReplay(),
    replayDone: s.replayDone,
    replayError: s.replayError,
    replayHasOrig: !!s.replayOrig,
    replayPrompt: s.replayPrompt,
    replayPromptShort: s.replayPrompt.length > 96 ? s.replayPrompt.slice(0, 96).trimEnd() + "…" : s.replayPrompt,
    replayOrigContent: s.replayOrig?.content || "",
    replayOrigModel: s.replayOrig?.modelName || "",
    replayOrigDot: s.replayOrig?.dot || "var(--color-neutral-400)",
    replayOrigCost: s.replayOrig ? "$" + s.replayOrig.cost.toFixed(4) : "—",
    replayNewText: s.replayNewText,
    replayNewModel: s.replayNew?.modelName || "",
    replayNewDot: s.replayNew?.dot || "var(--color-accent)",
    replayNewCost: s.replayNew ? "$" + s.replayNew.cost.toFixed(4) : "—",
    replayStreaming: s.replayRunning && !!s.replayOrig && !s.replayDone,
    replayCostDelta: replayCostDelta,
    replayDiffs: s.replayReal.map((d) => {
      const c = d.kind === "add" ? "var(--color-accent-300)" : d.kind === "drop" ? "#d68f9a" : "#d6c07a";
      const icon = d.kind === "add" ? "ph ph-plus-circle" : d.kind === "drop" ? "ph ph-minus-circle" : "ph ph-arrows-left-right";
      return { kind: d.kind, text: d.text, color: c, icon };
    }),
    replayPending: !s.replayOrig && !s.replayError,
    replayHint: s.replayRunning ? "Replaying the last real turn through another model…" : "Run replay to compare the last chat turn across models",
    replayBtnLabel: s.replayRunning ? "Replaying…" : s.replayDone ? "Replay again" : "Replay last turn",
    replayBtnIcon: s.replayRunning ? "ph ph-circle-notch" : s.replayDone ? "ph ph-arrow-counter-clockwise" : "ph ph-clock-clockwise",
    replaySpin: s.replayRunning ? "animation:ocspin 1s linear infinite" : "",
    marketCats,
    marketRows,
    recSteps,
    runRecovery: () => a.runRecovery(),
    recDone: s.recDone,
    recBtnLabel: s.recRunning ? "Recovering…" : s.recDone ? "Run again" : "Run recovery",
    recBtnIcon: s.recRunning ? "ph ph-circle-notch" : s.recDone ? "ph ph-arrow-counter-clockwise" : "ph ph-play",
    recSpin: s.recRunning ? "animation:ocspin 1s linear infinite" : "",
    runCounter: () => a.runCounter(),
    cfDone: s.cfDone,
    cfPending: !s.cfDone,
    cfMetrics,
    cfVerdict: CF_VERDICT,
    cfBtnLabel: s.cfRunning ? "Simulating…" : s.cfDone ? "Reset" : "Simulate outcome",
    cfBtnIcon: s.cfRunning ? "ph ph-circle-notch" : s.cfDone ? "ph ph-arrow-counter-clockwise" : "ph ph-flow-arrow",
    cfSpin: s.cfRunning ? "animation:ocspin 1s linear infinite" : "",
    isChat: s.view === "chat",
    isDash: s.view === "dash",
    isTimeline: s.view === "timeline",
    isAudit: s.view === "audit",
    isLibrary: s.view === "library",
    isSettings: s.view === "settings",
    gearColor: s.view === "settings" ? "var(--color-accent)" : "var(--color-neutral-500)",
    ...liveVals,
    events: liveEvents,
    artifactCount: artifacts.length,
    artifacts,
    settingsTabs,
    toolsList,
    mcpList,
    providersList,
    isPromptTab: s.settingsTab === "prompt",
    isToolsTab: s.settingsTab === "tools",
    isMcpTab: s.settingsTab === "mcp",
    isProvidersTab: s.settingsTab === "providers",
    isPluginsTab: s.settingsTab === "plugins",
    isRiskTab: s.settingsTab === "risk",
    isMemoryTab: s.settingsTab === "memory",
    isAppearanceTab: s.settingsTab === "appearance",
    pluginCats,
    pluginList,
    pluginsOnCount: Object.values(s.plugins).filter(Boolean).length,
    pluginsTotal: PLUGINS.length,
    guardList,
    memList,
    appearList,
    densityOpts,
    capActions,
    capActionNote,
    capVal: s.cap,
    onCap: (e: React.ChangeEvent<HTMLInputElement>) => a.setCap(parseInt(e.target.value)),
    capNote: s.cap < 30 ? "Tight — expect the Hub to downgrade routing often." : s.cap > 120 ? "Generous. Nightshift and the loop will use it." : "Current spend is $18.40 of this ceiling.",
    halfVal: s.half,
    onHalf: (e: React.ChangeEvent<HTMLInputElement>) => a.setHalf(parseInt(e.target.value)),
    memGraphStat: "10 nodes, 14 edges, 2 unsupported assumptions in the graph right now.",
    goGraph: () => a.switchView("graph"),
    sysPrompt: s.sysPrompt,
    aboutText: s.aboutText,
    promptSaved: s.promptSaved,
    openSettings: () => a.openSettings(),
    toggleLive: () => a.toggleLive(),
    savePrompt: () => a.savePrompt(),
    onPrompt: (e: React.ChangeEvent<HTMLTextAreaElement>) => a.setSysPrompt(e.target.value),
    onAbout: (e: React.ChangeEvent<HTMLTextAreaElement>) => a.setAboutText(e.target.value),
    navItems,
    sessionGroups,
    models,
    model,
    pickerOpen: s.pickerOpen,
    activeTitle: activeSession ? activeSession.title : "New chat",
    contextChips: [
      { icon: "ph ph-folder-simple", label: "stark-os" },
      { icon: "ph ph-brain", label: "cross-agent memory" },
      { icon: "ph ph-git-branch", label: "develop" },
    ],
    sessionTokens: tok >= 1000 ? (tok / 1000).toFixed(1) + "k" : String(tok),
    sessionCost: "$" + (totalUsd >= 0.01 || totalUsd === 0 ? totalUsd.toFixed(2) : totalUsd.toFixed(4)),
    apiKeyMissing: !s.apiKey,
    booted: s.booted,
    needsAuth: s.needsAuth,
    chatEmpty: messages.length === 0,
    messages,
    attachments: s.attachments.map((at, i) => ({ name: at.name, icon: at.icon, onRemove: () => a.removeAttach(i) })),
    hasAttachments: s.attachments.length > 0,
    setInputRef: (el: HTMLTextAreaElement | null) => a.setInputRef(el),
    setThreadRef: (el: HTMLDivElement | null) => a.setThreadRef(el),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => a.onKeyDown(e),
    send: () => a.send(),
    attach: () => a.attach(),
    togglePicker: () => a.togglePicker(),
    newChat: () => a.newChat(),

    // dashboard — real projection when available, static fallback otherwise
    stats: dash
      ? [
          { kicker: "Spend", value: "$" + dash.spend.toFixed(dash.spend >= 0.01 || dash.spend === 0 ? 2 : 4), meta: dash.apiKey ? "real API cost" : "set an API key", icon: "ph ph-coins" },
          { kicker: "Messages", value: String(dash.messages), meta: "across " + dash.sessions + " sessions", icon: "ph ph-chats-circle" },
          { kicker: "Tokens", value: dash.tokens >= 1000 ? (dash.tokens / 1000).toFixed(1) + "k" : String(dash.tokens), meta: "input + output", icon: "ph ph-textbox" },
          { kicker: "Sessions", value: String(dash.sessions), meta: "chat threads", icon: "ph ph-squares-four" },
        ]
      : DASH_STATS,
    agents: DASH_AGENTS,
    tasks: DASH_TASKS,

    // audit — real, append-only events from the backend
    auditRows: s.events.slice(0, 14).map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      ver: 1,
      cost: e.cost ? "$" + e.cost.toFixed(4) : "—",
      approval: e.approval || "N/A",
      apClass: e.approval === "Approved" ? "tag-accent" : e.approval === "Pending" ? "tag-outline" : "tag-neutral",
    })),
  };
}

export type Vals = ReturnType<typeof deriveVals>;
