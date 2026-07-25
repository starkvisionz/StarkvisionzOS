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
        <b>Prototype.</b> Chat, Timeline, Audit and Dashboard are live — real Claude API + an event-sourced store. The <b>Lab</b> views (graph, loop, nightshift, market, and the rest) are interactive simulations, each labeled <i>Simulated</i>.
      </span>
    </div>
  );
}
