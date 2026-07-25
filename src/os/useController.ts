import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, State, TimelineEvent } from "./types";
import {
  EVENT_POOL,
  INITIAL_ABOUT,
  INITIAL_EVENTS,
  INITIAL_LOOP_TASK,
  INITIAL_MCP,
  INITIAL_SESSIONS,
  INITIAL_SYS_PROMPT,
  MODELS,
  PROJECTS,
  loopSeed,
  replyFor,
  seed,
} from "./data";
import { CLAIMS, NEG_TURNS, NIGHT_FINDINGS } from "./labdata";

function initialState(): State {
  return {
    view: "chat",
    pickerOpen: false,
    modelId: "gpt-desktop",
    activeId: "s1",
    streaming: false,
    attachments: [],
    sessions: INITIAL_SESSIONS.map((s) => ({ ...s })),
    msgs: seed(),
    liveOn: true,
    events: INITIAL_EVENTS.map((e) => ({ ...e })),
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
  };
}

let evtCounter = 0;

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

  // A ref that always holds the latest state, so timers/handlers read fresh values.
  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback(
    (u: Partial<State> | ((s: State) => Partial<State>)) => {
      setRaw((prev) => {
        const patch = typeof u === "function" ? (u as (s: State) => Partial<State>)(prev) : u;
        return { ...prev, ...patch };
      });
    },
    [],
  );

  // DOM refs
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef<HTMLInputElement | null>(null);

  // timer refs
  const liveT = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopT = useRef<ReturnType<typeof setInterval> | null>(null);
  const recT = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamT = useRef<ReturnType<typeof setInterval> | null>(null);

  const now = useCallback(() => {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }, []);

  const pushEvent = useCallback(
    (e: Partial<TimelineEvent> & Pick<TimelineEvent, "type" | "summary" | "actor" | "evidence" | "icon" | "dot">) => {
      const id = "ev" + Date.now() + "_" + evtCounter++;
      const evt: TimelineEvent = { ...e, id, time: e.time || now(), fresh: true };
      setState((s) => ({ events: [evt, ...s.events].slice(0, 40) }));
      setTimeout(
        () => setState((s) => ({ events: s.events.map((x) => (x.id === id ? { ...x, fresh: false } : x)) })),
        2200,
      );
    },
    [now, setState],
  );

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

  // ── live event stream ──
  const startLive = useCallback(() => {
    if (liveT.current) return;
    liveT.current = setInterval(() => {
      if (stateRef.current.liveOn) {
        const p = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
        pushEvent({ ...p });
      }
    }, 4500);
  }, [pushEvent]);

  // mount: seed live stream + keyboard shortcuts + click-away for picker
  useEffect(() => {
    startLive();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setState((s) => ({ paletteOpen: !s.paletteOpen, paletteQuery: "" }));
        setTimeout(() => paletteRef.current && paletteRef.current.focus(), 40);
      }
      if (e.key === "Escape") setState({ paletteOpen: false });
    };
    const onClick = (e: MouseEvent) => {
      if (stateRef.current.pickerOpen && !(e.target as HTMLElement).closest(".btn")) {
        setState({ pickerOpen: false });
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      if (liveT.current) clearInterval(liveT.current);
      if (loopT.current) clearInterval(loopT.current);
      if (recT.current) clearInterval(recT.current);
      if (streamT.current) clearInterval(streamT.current);
      liveT.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── actions ──
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
      pushEvent({ type: "project.switched", summary: "Switched context to " + p.name, actor: "Eric Stark", evidence: "prj_" + id, icon: "ph ph-folders", dot: "var(--color-accent)" });
    },
    selectRepo(id) {
      const p = PROJECTS.find((x) => x.id === stateRef.current.projId) || PROJECTS[0];
      const r = p.repos.find((x) => x.id === id)!;
      setState({ repoId: id, repoOpen: false });
      pushEvent({ type: "repo.scoped", summary: "Agent scope set to " + r.name + " · " + r.branch, actor: "Eric Stark", evidence: "repo_" + id, icon: "ph ph-git-branch", dot: "var(--color-accent)" });
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
      setTimeout(() => {
        setState({ replayRunning: false, replayDone: true });
        pushEvent({ type: "decision.replayed", summary: "dec_204 replayed through Claude 4.5 — sharper, 3× cheaper", actor: "hub", evidence: "dec_204", icon: "ph ph-clock-clockwise", dot: "var(--color-accent-300)" });
      }, 1500);
    },
    mergeBranch(id) {
      setState({ mergedBranch: id });
      pushEvent({ type: "branch.merged", summary: "Branch " + id.toUpperCase() + " merged into the main timeline", actor: "Eric Stark", evidence: "wf_datastore", icon: "ph ph-git-merge", dot: "var(--color-accent)" });
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
      setTimeout(
        () => pushEvent({ type: "recovery.completed", summary: "Autonomous recovery restored deploy 38", actor: "hub", evidence: "run_1183", icon: "ph ph-heartbeat", dot: "var(--color-accent)" }),
        6200,
      );
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
      if (stateRef.current.loopRunning) return;
      if (loopT.current) clearInterval(loopT.current);
      const script = loopSeed();
      setState({ loopScript: script, loopRunning: true, loopDone: false, loopRevealed: 1 });
      let rev = 1;
      loopT.current = setInterval(() => {
        rev += 1;
        const done = rev >= script.length;
        setState({ loopRevealed: rev, loopRunning: !done, loopDone: done });
        if (done) {
          if (loopT.current) clearInterval(loopT.current);
          const last = script[script.length - 1];
          pushEvent({ type: "loop.converged", summary: "Multi-agent loop converged at score " + last.score, actor: "hub", evidence: "loop_" + (Math.floor(Math.random() * 900) + 100), icon: "ph ph-arrows-clockwise", dot: "var(--color-accent)" });
        }
      }, 1500);
    },
    resetLoop() {
      if (loopT.current) clearInterval(loopT.current);
      setState({ loopRevealed: 0, loopRunning: false, loopDone: false, loopScript: loopSeed() });
    },
    improveMore() {
      setState((s) => {
        const prev = s.loopScript[s.loopScript.length - 1];
        const sc = Math.min(prev.score + 3, 99);
        const round = {
          author: "forge",
          score: sc,
          draft: "Refined further: tightened the canonical-hash spec and made the dedupe window a config value with a safe 30-day default.",
          reviews: [
            { agent: "claude", score: Math.min(sc + 1, 99), note: "No further concerns." },
            { agent: "hermes", score: sc, note: "Converged." },
          ],
        };
        const script = [...s.loopScript, round];
        return { loopScript: script, loopRevealed: script.length, loopDone: true };
      });
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
      scrollThread();
    },
    newChat() {
      const s = stateRef.current;
      const id = "s" + Date.now();
      const modelName = (MODELS.find((x) => x.id === s.modelId) || MODELS[0]).name;
      setState((st) => ({
        activeId: id,
        view: "chat",
        sessions: [{ id, title: "New chat", grp: "Today", dot: "var(--color-neutral-500)" }, ...st.sessions],
        msgs: {
          ...st.msgs,
          [id]: [
            {
              id: "m0",
              role: "assistant",
              agent: st.modelId,
              blocks: [{ id: "b0", type: "text", text: "New chat — ask me anything. It'll route through " + modelName + " and every turn is logged to the Hub." }],
            },
          ],
        },
      }));
    },
    togglePicker() {
      setState((s) => ({ pickerOpen: !s.pickerOpen }));
    },
    selectModel(id) {
      setState({ modelId: id, pickerOpen: false });
    },
    approve(sid, bid) {
      patchBlock(sid, bid, { status: "approved" });
      pushEvent({ type: "human.change_approved", summary: "Agent action approved by Eric Stark", actor: "Eric Stark", evidence: "dec_" + (Math.floor(Math.random() * 900) + 100), icon: "ph ph-shield-check", dot: "var(--color-accent-300)" });
    },
    reject(sid, bid) {
      patchBlock(sid, bid, { status: "rejected" });
      pushEvent({ type: "human.change_rejected", summary: "Agent action rejected by Eric Stark", actor: "Eric Stark", evidence: "dec_" + (Math.floor(Math.random() * 900) + 100), icon: "ph ph-x-circle", dot: "var(--color-neutral-400)" });
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
      if (s.streaming) return;
      const el = inputRef.current;
      const text = (el ? el.value : "").trim();
      if (!text && s.attachments.length === 0) return;
      if (el) {
        el.value = "";
        el.style.height = "auto";
      }
      const sid = s.activeId;
      const files = s.attachments.slice();
      const uid = "u" + Date.now();
      const aid = "a" + Date.now();
      const bid = "s" + Date.now();
      const curMsgs = s.msgs[sid] || [];
      const first =
        curMsgs.length === 0 ||
        curMsgs.every((m) => m.role === "assistant" && m.blocks[0] && /New chat/.test(m.blocks[0].text || ""));
      setState((st) => {
        const msgs = { ...st.msgs };
        const base = first ? [] : (msgs[sid] || []).slice();
        base.push({ id: uid, role: "user", blocks: [{ id: uid + "t", type: "text", text: text || "(sent attachments)" }], files });
        base.push({ id: aid, role: "assistant", agent: st.modelId, blocks: [{ id: bid, type: "text", text: "", streaming: true }] });
        msgs[sid] = base;
        let sessions = st.sessions;
        if (first && text) sessions = st.sessions.map((x) => (x.id === sid ? { ...x, title: text.slice(0, 42), dot: "var(--color-accent)" } : x));
        return { msgs, streaming: true, attachments: [], sessions };
      });
      scrollThread();
      const mp = MODELS.find((x) => x.id === s.modelId) || MODELS[0];
      pushEvent({ type: "session.message", summary: "Message routed to " + mp.name + " · " + mp.sub, actor: "Eric Stark", evidence: "ses_" + (Math.floor(Math.random() * 9000) + 1000), icon: "ph ph-paper-plane-tilt", dot: "var(--color-neutral-400)" });

      const full = replyFor(text, s.modelId);
      const words = full.split(" ");
      let i = 0;
      if (streamT.current) clearInterval(streamT.current);
      streamT.current = setInterval(() => {
        i += 2;
        const partial = words.slice(0, i).join(" ");
        const done = i >= words.length;
        patchBlock(sid, bid, { text: partial, streaming: !done });
        scrollThread();
        if (done) {
          if (streamT.current) clearInterval(streamT.current);
          setState({ streaming: false });
        }
      }, 55);
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
          if (last) pushEvent({ type: "negotiation.settled", summary: "Deadlock settled by negotiation — 3 concessions recorded", actor: "hub", evidence: "neg_" + (Math.floor(Math.random() * 900) + 100), icon: "ph ph-handshake", dot: "var(--color-accent)" });
        }, 500 + i * 950),
      );
    },
    closeSpot(id) {
      setState((s) => ({ closedSpots: { ...s.closedSpots, [id]: !s.closedSpots[id] } }));
    },
    runNight() {
      if (stateRef.current.nightRunning) return;
      setState({ nightRunning: true, nightRevealed: 0 });
      NIGHT_FINDINGS.forEach((_, i) =>
        setTimeout(() => {
          setState({ nightRevealed: i + 1, nightRunning: i + 1 < NIGHT_FINDINGS.length });
          if (i === NIGHT_FINDINGS.length - 1) pushEvent({ type: "nightshift.brief_filed", summary: "Nightshift filed the morning brief — 4 findings, 2 awaiting approval", actor: "hub", evidence: "shift_" + (Math.floor(Math.random() * 900) + 100), icon: "ph ph-moon-stars", dot: "var(--color-accent)" });
        }, 550 + i * 750),
      );
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
