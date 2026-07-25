import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, ChatModel, LoopRoundSeed, Message, NightFinding, State, TimelineEvent } from "./types";
import {
  INITIAL_ABOUT,
  INITIAL_LOOP_TASK,
  INITIAL_MCP,
  INITIAL_SYS_PROMPT,
  PROJECTS,
  loopSeed,
} from "./data";
import { CLAIMS, NEG_TURNS } from "./labdata";
import { ApiError, api, streamChat, streamSSE, type ApiEvent, type ApiMessage, type ApiSession } from "../api";

function initialState(): State {
  return {
    view: "chat",
    pickerOpen: false,
    modelId: "claude-opus-5",
    activeId: "",
    streaming: false,
    attachments: [],
    sessions: [],
    msgs: {},
    liveOn: true,
    events: [],
    settingsTab: "prompt",
    sysPrompt: INITIAL_SYS_PROMPT,
    aboutText: INITIAL_ABOUT,
    tools: { web: true, code: true, files: true, github: true, coolify: false, terminal: false, postgres: true },
    mcp: INITIAL_MCP.map((m) => ({ ...m })),
    promptSaved: false,
    loopTask: INITIAL_LOOP_TASK,
    loopRunning: false,
    loopDone: false,
    loopRevealed: 0,
    loopScript: loopSeed(),
    paletteOpen: false,
    paletteQuery: "",
    timeTravel: false,
    ttPos: 100,
    graphSel: "decision",
    graphHidden: {},
    graphDepth: 2,
    gqValue: "Why does the 90-day retention window exist?",
    gqAnswered: false,
    gqRunning: false,
    plugins: { linear: true, slack: true, sentry: false, figma: false, gitguard: true, ledger: false },
    pluginCat: "all",
    guards: { budget: true, prodWrite: true, secrets: true, netEgress: false },
    mem: { autoPrune: true, contradiction: true, semantic: true, forget: false },
    appear: { glow: true, motion: true, mono: false, thumbs: true },
    cap: 50,
    capAction: "pause",
    density: "compact",
    half: 30,
    projId: "hub",
    repoId: "hub-web",
    projOpen: false,
    repoOpen: false,
    claimConf: {},
    claimAge: {},
    checking: {},
    nightRunning: false,
    nightRevealed: 0,
    negRunning: false,
    negRevealed: 0,
    negDeal: false,
    closedSpots: {},
    stake: "customer",
    replayRunning: false,
    replayDone: false,
    mergedBranch: null,
    recRunning: false,
    recDone: false,
    recStep: 1,
    cfRunning: false,
    cfDone: false,
    marketCat: "Coding",
    chatModels: [],
    apiKey: false,
    booted: false,
    dash: null,
    needsAuth: false,
    loopError: "",
    nightReal: [],
    nightError: "",
  };
}

// ── mapping helpers (backend → view state) ──
function mapEvent(e: ApiEvent): TimelineEvent {
  const d = new Date(e.created_at);
  const time = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  return {
    id: e.id,
    type: e.type,
    summary: e.summary,
    actor: e.actor,
    evidence: e.evidence,
    icon: e.icon,
    dot: e.dot,
    time,
    cost: e.cost,
    approval: e.approval,
    createdAt: e.created_at,
  };
}

function mapSessions(sessions: ApiSession[]): State["sessions"] {
  return sessions.map((s) => ({ id: s.id, title: s.title || "New chat", grp: s.grp || "Today", dot: "var(--color-neutral-500)" }));
}

function agentDisplay(model: string | null, models: ChatModel[]) {
  const m = models.find((x) => x.id === model);
  return { name: m?.name || "Claude", icon: "ph ph-sparkle", dot: m?.dot || "var(--color-accent)" };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapLoopRound(data: Record<string, unknown>): LoopRoundSeed {
  const reviews = Array.isArray(data.reviews) ? (data.reviews as Record<string, unknown>[]) : [];
  return {
    author: "claude-opus",
    authorName: "Claude Opus",
    authorIcon: "ph ph-sparkle",
    authorDot: "var(--color-accent)",
    score: Number(data.score) || 0,
    draft: String(data.draft ?? ""),
    reviews: reviews.map((rv) => ({
      agent: String(rv.name ?? "reviewer"),
      name: cap(String(rv.name ?? "reviewer")),
      icon: "ph ph-scales",
      dot: "var(--color-accent-400)",
      score: Number(rv.score) || 0,
      note: String(rv.note ?? ""),
    })),
  };
}

function mapMessages(rows: ApiMessage[], models: ChatModel[]): Message[] {
  return rows.map((r): Message => {
    if (r.role === "user") {
      return { id: r.id, role: "user", blocks: [{ id: r.id + "t", type: "text", text: r.content }], files: [] };
    }
    const ad = agentDisplay(r.model, models);
    const tok = r.input_tokens + r.output_tokens;
    return {
      id: r.id,
      role: "assistant",
      agent: r.model || "claude-opus-5",
      agentName: ad.name,
      agentIcon: ad.icon,
      agentDot: ad.dot,
      cost: r.cost ? "$" + r.cost.toFixed(4) : "",
      tokens: tok,
      usd: r.cost,
      blocks: [{ id: r.id + "b", type: "text", text: r.content }],
    };
  });
}

export interface Actions {
  openPalette(): void;
  closePalette(): void;
  toggleTimeTravel(): void;
  setTtPos(v: number): void;
  setPaletteQuery(q: string): void;
  toggleProj(): void;
  toggleRepo(): void;
  selectProj(id: string): void;
  selectRepo(id: string): void;
  selectGraphNode(id: string): void;
  toggleGraphType(t: string): void;
  setGraphDepth(v: number): void;
  setGqValue(v: string): void;
  runGq(): void;
  togglePlugin(k: string): void;
  toggleGuard(k: string): void;
  toggleMem(k: string): void;
  toggleAppear(k: string): void;
  setPluginCat(c: string): void;
  setDensity(d: string): void;
  setCap(v: number): void;
  setCapAction(a: string): void;
  setHalf(v: number): void;
  runReplay(): void;
  mergeBranch(id: string): void;
  setMarketCat(c: string): void;
  runRecovery(): void;
  runCounter(): void;
  runLoop(): void;
  resetLoop(): void;
  improveMore(): void;
  setLoopTask(v: string): void;
  toggleLive(): void;
  openSettings(): void;
  setSettingsTab(t: State["settingsTab"]): void;
  toggleTool(k: string): void;
  toggleMcp(id: string): void;
  savePrompt(): void;
  setSysPrompt(v: string): void;
  setAboutText(v: string): void;
  switchView(v: State["view"]): void;
  switchSession(id: string): void;
  newChat(): void;
  togglePicker(): void;
  selectModel(id: string): void;
  approve(sid: string, bid: string): void;
  reject(sid: string, bid: string): void;
  attach(): void;
  removeAttach(i: number): void;
  send(): void;
  onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void;
  setStake(id: string): void;
  runNeg(): void;
  closeSpot(id: string): void;
  runNight(): void;
  reverify(id: string): void;
  reverifyAll(): void;
  setInputRef(el: HTMLTextAreaElement | null): void;
  setThreadRef(el: HTMLDivElement | null): void;
  setPaletteRef(el: HTMLInputElement | null): void;
}

export interface Controller {
  state: State;
  actions: Actions;
}

export function useController(): Controller {
  const [state, setRaw] = useState<State>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback((u: Partial<State> | ((s: State) => Partial<State>)) => {
    setRaw((prev) => {
      const patch = typeof u === "function" ? (u as (s: State) => Partial<State>)(prev) : u;
      return { ...prev, ...patch };
    });
  }, []);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef<HTMLInputElement | null>(null);

  const recT = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollT = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatAbort = useRef<AbortController | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);

  const scrollThread = useCallback(() => {
    requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
  }, []);

  const patchBlock = useCallback(
    (sid: string, bid: string, patch: Partial<Block>) => {
      setState((s) => {
        const msgs = { ...s.msgs };
        msgs[sid] = (msgs[sid] || []).map((m) => ({
          ...m,
          blocks: (m.blocks || []).map((b) => (b.id === bid ? { ...b, ...patch } : b)),
        }));
        return { msgs };
      });
    },
    [setState],
  );

  const patchMessage = useCallback(
    (sid: string, mid: string, patch: Partial<Message>) => {
      setState((s) => {
        const msgs = { ...s.msgs };
        msgs[sid] = (msgs[sid] || []).map((m) => (m.id === mid ? { ...m, ...patch } : m));
        return { msgs };
      });
    },
    [setState],
  );

  const refreshFeeds = useCallback(async () => {
    try {
      const [ev, dash] = await Promise.all([api.events(40), api.dashboard()]);
      setState({ events: ev.events.map(mapEvent), dash });
    } catch {
      /* backend may be momentarily unavailable */
    }
  }, [setState]);

  const refreshSessions = useCallback(async () => {
    try {
      const s = await api.listSessions();
      setState({ sessions: mapSessions(s.sessions) });
    } catch {
      /* ignore */
    }
  }, [setState]);

  const loadMessages = useCallback(
    async (id: string) => {
      try {
        const r = await api.messages(id);
        setState((s) => ({ msgs: { ...s.msgs, [id]: mapMessages(r.messages, s.chatModels) } }));
        scrollThread();
      } catch {
        /* ignore */
      }
    },
    [setState, scrollThread],
  );

  // ── boot: load models, sessions, first thread, feeds; wire shortcuts + polling ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await api.models();
        const st = (await api.getSettings()).settings;
        const sess = await api.listSessions();
        let sessions = sess.sessions;
        if (sessions.length === 0) {
          const c = await api.createSession(st.model || m.default);
          sessions = [c.session];
        }
        const active = sessions[0];
        const msgsRes = await api.messages(active.id);
        if (cancelled) return;
        setState({
          chatModels: m.models,
          apiKey: m.apiKey,
          modelId: st.model || m.default,
          sessions: mapSessions(sessions),
          activeId: active.id,
          msgs: { [active.id]: mapMessages(msgsRes.messages, m.models) },
          // persisted settings
          sysPrompt: st.sysPrompt,
          aboutText: st.aboutText,
          tools: st.tools,
          plugins: st.plugins,
          guards: st.guards,
          mem: st.mem,
          appear: st.appear,
          stake: st.stake,
          cap: st.cap,
          capAction: st.capAction,
          density: st.density,
          half: st.half,
          booted: true,
        });
        refreshFeeds();
      } catch (e) {
        if (cancelled) return;
        const unauth = e instanceof ApiError && e.status === 401;
        setState({ booted: true, needsAuth: unauth });
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setState((s) => ({ paletteOpen: !s.paletteOpen, paletteQuery: "" }));
        setTimeout(() => paletteRef.current && paletteRef.current.focus(), 40);
      }
      if (e.key === "Escape") setState({ paletteOpen: false });
    };
    const onClick = (e: MouseEvent) => {
      if (stateRef.current.pickerOpen && !(e.target as HTMLElement).closest(".btn")) setState({ pickerOpen: false });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    pollT.current = setInterval(() => {
      if (stateRef.current.liveOn && stateRef.current.booted) refreshFeeds();
    }, 4500);

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      if (recT.current) clearInterval(recT.current);
      if (pollT.current) clearInterval(pollT.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      chatAbort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── persist settings (debounced) whenever a settings field changes ──
  useEffect(() => {
    if (!state.booted) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const s = stateRef.current;
      api
        .putSettings({
          sysPrompt: s.sysPrompt,
          aboutText: s.aboutText,
          model: s.modelId,
          tools: s.tools,
          plugins: s.plugins,
          guards: s.guards,
          mem: s.mem,
          appear: s.appear,
          stake: s.stake,
          cap: s.cap,
          capAction: s.capAction,
          density: s.density,
          half: s.half,
        })
        .catch(() => {});
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.booted,
    state.sysPrompt,
    state.aboutText,
    state.modelId,
    state.tools,
    state.plugins,
    state.guards,
    state.mem,
    state.appear,
    state.stake,
    state.cap,
    state.capAction,
    state.density,
    state.half,
  ]);

  const actions: Actions = {
    openPalette() {
      setState({ paletteOpen: true, paletteQuery: "" });
      setTimeout(() => paletteRef.current && paletteRef.current.focus(), 40);
    },
    closePalette() {
      setState({ paletteOpen: false });
    },
    toggleTimeTravel() {
      setState((s) => ({ timeTravel: !s.timeTravel }));
    },
    setTtPos(v) {
      setState({ ttPos: v });
    },
    setPaletteQuery(q) {
      setState({ paletteQuery: q });
    },
    toggleProj() {
      setState((s) => ({ projOpen: !s.projOpen, repoOpen: false }));
    },
    toggleRepo() {
      setState((s) => ({ repoOpen: !s.repoOpen, projOpen: false }));
    },
    selectProj(id) {
      const p = PROJECTS.find((x) => x.id === id)!;
      setState({ projId: id, repoId: p.repos[0].id, projOpen: false });
    },
    selectRepo(id) {
      setState({ repoId: id, repoOpen: false });
    },
    selectGraphNode(id) {
      setState({ graphSel: id });
    },
    toggleGraphType(t) {
      setState((s) => ({ graphHidden: { ...s.graphHidden, [t]: !s.graphHidden[t] } }));
    },
    setGraphDepth(v) {
      setState({ graphDepth: v });
    },
    setGqValue(v) {
      setState({ gqValue: v });
    },
    runGq() {
      if (stateRef.current.gqRunning) return;
      setState({ gqRunning: true, gqAnswered: false });
      setTimeout(() => setState({ gqRunning: false, gqAnswered: true, graphSel: "retention" }), 900);
    },
    togglePlugin(k) {
      setState((s) => ({ plugins: { ...s.plugins, [k]: !s.plugins[k] } }));
    },
    toggleGuard(k) {
      setState((s) => ({ guards: { ...s.guards, [k]: !s.guards[k] } }));
    },
    toggleMem(k) {
      setState((s) => ({ mem: { ...s.mem, [k]: !s.mem[k] } }));
    },
    toggleAppear(k) {
      setState((s) => ({ appear: { ...s.appear, [k]: !s.appear[k] } }));
    },
    setPluginCat(c) {
      setState({ pluginCat: c });
    },
    setDensity(d) {
      setState({ density: d });
    },
    setCap(v) {
      setState({ cap: v });
    },
    setCapAction(a) {
      setState({ capAction: a });
    },
    setHalf(v) {
      setState({ half: v });
    },
    runReplay() {
      const s = stateRef.current;
      if (s.replayRunning || s.replayDone) {
        setState({ replayDone: false, replayRunning: false });
        return;
      }
      setState({ replayRunning: true, replayDone: false });
      setTimeout(() => setState({ replayRunning: false, replayDone: true }), 1500);
    },
    mergeBranch(id) {
      setState({ mergedBranch: id });
    },
    setMarketCat(c) {
      setState({ marketCat: c });
    },
    runRecovery() {
      if (stateRef.current.recRunning) return;
      if (recT.current) clearInterval(recT.current);
      setState({ recRunning: true, recDone: false, recStep: 1 });
      recT.current = setInterval(() => {
        setState((s) => {
          const step = s.recStep + 1;
          const done = step >= 8;
          if (done && recT.current) clearInterval(recT.current);
          return { recStep: step, recRunning: !done, recDone: done };
        });
      }, 750);
    },
    runCounter() {
      const s = stateRef.current;
      if (s.cfRunning || s.cfDone) {
        setState({ cfDone: false });
        return;
      }
      setState({ cfRunning: true, cfDone: false });
      setTimeout(() => setState({ cfRunning: false, cfDone: true }), 1400);
    },
    runLoop() {
      const s = stateRef.current;
      if (s.loopRunning) return;
      const task = (s.loopTask || "").trim();
      if (!task) return;
      setState({ loopScript: [], loopRevealed: 0, loopRunning: true, loopDone: false, loopError: "" });
      streamSSE("/api/loop/run", { task, target: 90 }, (event, data) => {
        if (event === "round") {
          const round = mapLoopRound(data);
          setState((st) => {
            const script = [...st.loopScript, round];
            return { loopScript: script, loopRevealed: script.length };
          });
        } else if (event === "done") {
          setState({ loopRunning: false, loopDone: !!data.converged });
        } else if (event === "error") {
          setState({ loopRunning: false, loopError: String(data.message || "Loop failed.") });
        }
      });
    },
    resetLoop() {
      setState({ loopScript: [], loopRevealed: 0, loopRunning: false, loopDone: false, loopError: "" });
    },
    improveMore() {
      actions.runLoop();
    },
    setLoopTask(v) {
      setState({ loopTask: v });
    },
    toggleLive() {
      setState((s) => ({ liveOn: !s.liveOn }));
    },
    openSettings() {
      setState({ view: "settings", pickerOpen: false });
    },
    setSettingsTab(t) {
      setState({ settingsTab: t });
    },
    toggleTool(k) {
      setState((s) => ({ tools: { ...s.tools, [k]: !s.tools[k] } }));
    },
    toggleMcp(id) {
      setState((s) => ({ mcp: s.mcp.map((m) => (m.id === id ? { ...m, connected: !m.connected } : m)) }));
    },
    savePrompt() {
      const s = stateRef.current;
      api.putSettings({ sysPrompt: s.sysPrompt, aboutText: s.aboutText }).catch(() => {});
      setState({ promptSaved: true });
      setTimeout(() => setState({ promptSaved: false }), 1900);
    },
    setSysPrompt(v) {
      setState({ sysPrompt: v });
    },
    setAboutText(v) {
      setState({ aboutText: v });
    },
    switchView(v) {
      setState({ view: v, pickerOpen: false });
    },
    switchSession(id) {
      setState({ activeId: id, view: "chat" });
      if (!stateRef.current.msgs[id]) loadMessages(id);
      else scrollThread();
    },
    async newChat() {
      try {
        const c = await api.createSession(stateRef.current.modelId);
        setState((s) => ({
          activeId: c.session.id,
          view: "chat",
          sessions: [{ id: c.session.id, title: "New chat", grp: "Today", dot: "var(--color-accent)" }, ...s.sessions],
          msgs: { ...s.msgs, [c.session.id]: [] },
        }));
        refreshFeeds();
      } catch {
        /* ignore */
      }
    },
    togglePicker() {
      setState((s) => ({ pickerOpen: !s.pickerOpen }));
    },
    selectModel(id) {
      setState({ modelId: id, pickerOpen: false });
    },
    approve() {
      /* approval blocks are part of the simulated seed; real chat has none */
    },
    reject() {
      /* see approve() */
    },
    attach() {
      const names: [string, string][] = [["build.log", "ph ph-file-text"], ["schema.sql", "ph ph-database"], ["deploy.yaml", "ph ph-file-code"], ["design.fig", "ph ph-figma-logo"]];
      const n = names[stateRef.current.attachments.length % names.length];
      setState((s) => ({ attachments: [...s.attachments, { name: n[0], icon: n[1] }] }));
    },
    removeAttach(i) {
      setState((s) => ({ attachments: s.attachments.filter((_, j) => j !== i) }));
    },
    send() {
      const s = stateRef.current;
      if (s.streaming || !s.activeId) return;
      const el = inputRef.current;
      const text = (el ? el.value : "").trim();
      if (!text) return;
      if (el) {
        el.value = "";
        el.style.height = "auto";
      }
      const sid = s.activeId;
      const model = s.modelId;
      const uid = "u" + Date.now();
      const aid = "a" + Date.now();
      const bid = "b" + Date.now();
      const ad = agentDisplay(model, s.chatModels);
      const wasEmpty = (s.msgs[sid] || []).filter((m) => m.role === "user").length === 0;

      setState((st) => {
        const base = (st.msgs[sid] || []).slice();
        base.push({ id: uid, role: "user", blocks: [{ id: uid + "t", type: "text", text }], files: [] });
        base.push({
          id: aid,
          role: "assistant",
          agent: model,
          agentName: ad.name,
          agentIcon: ad.icon,
          agentDot: ad.dot,
          blocks: [{ id: bid, type: "text", text: "", streaming: true }],
        });
        return { msgs: { ...st.msgs, [sid]: base }, streaming: true, attachments: [] };
      });
      scrollThread();

      let acc = "";
      chatAbort.current = streamChat(
        { sessionId: sid, content: text, model },
        {
          onToken: (t) => {
            acc += t;
            patchBlock(sid, bid, { text: acc, streaming: true });
            scrollThread();
          },
          onDone: (info) => {
            patchBlock(sid, bid, { text: acc, streaming: false });
            patchMessage(sid, aid, { tokens: info.tokens, usd: info.cost, cost: info.cost ? "$" + info.cost.toFixed(4) : "" });
            setState({ streaming: false });
            if (wasEmpty) refreshSessions();
            refreshFeeds();
          },
          onError: (message) => {
            patchBlock(sid, bid, { text: (acc ? acc + "\n\n" : "") + "⚠️ " + message, streaming: false });
            setState({ streaming: false });
            refreshFeeds();
          },
        },
      );
    },
    onKeyDown(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        actions.send();
      }
      const el = e.target as HTMLTextAreaElement;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 180) + "px";
    },
    setStake(id) {
      setState({ stake: id });
    },
    runNeg() {
      if (stateRef.current.negRunning) return;
      setState({ negRunning: true, negRevealed: 0, negDeal: false });
      NEG_TURNS.forEach((_, i) =>
        setTimeout(() => {
          const last = i === NEG_TURNS.length - 1;
          setState({ negRevealed: i + 1, negRunning: !last, negDeal: last });
        }, 500 + i * 950),
      );
    },
    closeSpot(id) {
      setState((s) => ({ closedSpots: { ...s.closedSpots, [id]: !s.closedSpots[id] } }));
    },
    runNight() {
      if (stateRef.current.nightRunning) return;
      setState({ nightRunning: true, nightRevealed: 0, nightReal: [], nightError: "" });
      streamSSE("/api/nightshift/run", {}, (event, data) => {
        if (event === "brief") {
          const raw = Array.isArray(data.findings) ? (data.findings as Record<string, unknown>[]) : [];
          const findings: NightFinding[] = raw.map((f) => ({
            kind: String(f.kind ?? "watch"),
            title: String(f.title ?? "Finding"),
            body: String(f.body ?? ""),
          }));
          setState({ nightReal: findings });
          // reveal findings one at a time for the animated feel
          findings.forEach((_, i) =>
            setTimeout(() => setState({ nightRevealed: i + 1, nightRunning: i + 1 < findings.length }), 260 * i),
          );
          if (findings.length === 0) setState({ nightRunning: false });
        } else if (event === "error") {
          setState({ nightRunning: false, nightError: String(data.message || "Nightshift failed.") });
        }
      });
    },
    reverify(id) {
      if (stateRef.current.checking[id]) return;
      setState((s) => ({ checking: { ...s.checking, [id]: true } }));
      setTimeout(
        () =>
          setState((s) => ({
            checking: { ...s.checking, [id]: false },
            claimConf: { ...s.claimConf, [id]: 97 },
            claimAge: { ...s.claimAge, [id]: "just now" },
          })),
        1100,
      );
    },
    reverifyAll() {
      const s = stateRef.current;
      CLAIMS.filter((c) => (s.claimConf[c.id] ?? c.conf) < 60).forEach((c, i) => setTimeout(() => actions.reverify(c.id), i * 260));
    },
    setInputRef(el) {
      inputRef.current = el;
    },
    setThreadRef(el) {
      threadRef.current = el;
    },
    setPaletteRef(el) {
      paletteRef.current = el;
    },
  };

  return { state, actions };
}
