import { useController } from "./os/useController";
import { deriveVals } from "./os/deriveVals";
import { css } from "./css";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { TimeTravel } from "./components/TimeTravel";
import { ChatView } from "./views/ChatView";
import { DashboardView } from "./views/DashboardView";
import { TimelineView } from "./views/TimelineView";
import { AuditView } from "./views/AuditView";
import { LoopView } from "./views/LoopView";
import { LibraryView } from "./views/LibraryView";
import { GraphView } from "./views/GraphView";
import { BranchesView } from "./views/BranchesView";
import { ReplayView } from "./views/ReplayView";
import { MarketView } from "./views/MarketView";
import { RecoveryView } from "./views/RecoveryView";
import { CounterfactualView } from "./views/CounterfactualView";
import { TruthDecayView } from "./views/TruthDecayView";
import { NightshiftView } from "./views/NightshiftView";
import { RegretView } from "./views/RegretView";
import { NegotiationView } from "./views/NegotiationView";
import { BlindSpotView } from "./views/BlindSpotView";
import { SettingsView } from "./views/SettingsView";

const ROOT_STYLE =
  "position:fixed;inset:0;display:flex;background:radial-gradient(1200px 720px at 80% -12%, color-mix(in srgb,var(--color-accent) 14%,transparent), transparent 58%), radial-gradient(900px 600px at 0% 110%, color-mix(in srgb,var(--color-accent) 8%,transparent), transparent 55%), var(--color-bg);color:var(--color-text);font-family:var(--font-body)";

export function App() {
  const { state, actions } = useController();
  const vals = deriveVals(state, actions);

  return (
    <div style={css(ROOT_STYLE)}>
      <Sidebar vals={vals} />

      <main style={css("flex:1;min-width:0;display:flex;flex-direction:column")}>
        {vals.isChat && <ChatView vals={vals} />}
        {vals.isDash && <DashboardView vals={vals} />}
        {vals.isTimeline && <TimelineView vals={vals} />}
        {vals.isAudit && <AuditView vals={vals} />}
        {vals.isLoop && <LoopView vals={vals} />}
        {vals.isLibrary && <LibraryView vals={vals} />}
        {vals.isGraph && <GraphView vals={vals} />}
        {vals.isBranches && <BranchesView vals={vals} />}
        {vals.isReplay && <ReplayView vals={vals} />}
        {vals.isMarket && <MarketView vals={vals} />}
        {vals.isRecovery && <RecoveryView vals={vals} />}
        {vals.isCounter && <CounterfactualView vals={vals} />}
        {vals.isTruth && <TruthDecayView vals={vals} />}
        {vals.isNight && <NightshiftView vals={vals} />}
        {vals.isRegret && <RegretView vals={vals} />}
        {vals.isNegotiate && <NegotiationView vals={vals} />}
        {vals.isBlind && <BlindSpotView vals={vals} />}
        {vals.isSettings && <SettingsView vals={vals} />}
      </main>

      {vals.paletteOpen && <CommandPalette vals={vals} />}
      {vals.timeTravel && <TimeTravel vals={vals} />}
    </div>
  );
}
