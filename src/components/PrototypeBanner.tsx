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
        <b>Non-production prototype.</b> Every feature here is simulated — mock data, no backend, no real AI calls, and nothing is deployed. No action performs a real side effect.
      </span>
    </div>
  );
}
