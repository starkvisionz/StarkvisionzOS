import { css } from "../css";

/**
 * Persistent, non-dismissible banner scoping the whole app as a non-production
 * prototype. Kept always-visible on purpose so the simulated nature of every
 * screen is never in doubt.
 */
export function PrototypeBanner() {
  return (
    <div className="proto-banner">
      <i className="ph-fill ph-flask" style={css("font-size:14px;color:#d6c07a;flex:none")} />
      <span>
        <b>Prototype.</b> Chat, Timeline, Audit, Dashboard, Settings, the <b>Multi-agent loop</b>, <b>Nightshift</b>, <b>Model replay</b>, <b>Agent branches</b>, the <b>Blind spot map</b>, <b>Counterfactual</b>, the <b>Agent market</b>, <b>Truth decay</b>, the <b>Memory graph</b> and <b>Autonomous recovery</b> are live — real Claude API + an event-sourced store. The remaining <b>Lab</b> views (regret, negotiation) are interactive simulations, each labeled <i>Simulated</i>.
      </span>
    </div>
  );
}
