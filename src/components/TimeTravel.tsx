import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function TimeTravel({ vals }: { vals: Vals }) {
  return (
    <div style={css("position:fixed;left:262px;right:0;bottom:0;z-index:60;background:linear-gradient(0deg,#05060c,color-mix(in srgb,#05060c 90%,transparent));border-top:1px solid var(--color-accent-600);padding:13px 22px;box-shadow:0 -12px 34px rgba(0,0,0,.55)")}>
      <div style={css("display:flex;align-items:center;gap:14px;max-width:920px;margin:0 auto")}>
        <i className="ph ph-clock-counter-clockwise" style={css("font-size:19px;color:var(--color-accent)")} />
        <div style={css("font-size:12.5px;color:var(--color-neutral-300);white-space:nowrap")}>Viewing project <b style={css("color:var(--color-accent-300)")}>as of {vals.ttLabel}</b></div>
        <input type="range" min={0} max={100} value={vals.ttPos} onChange={vals.onTtPos} style={css("flex:1;accent-color:var(--color-accent)")} />
        <span style={css("font-size:11px;color:var(--color-neutral-500);font-family:ui-monospace,Menlo,monospace;white-space:nowrap")}>{vals.ttEvents} events</span>
        <button className="btn btn-secondary" onClick={vals.toggleTimeTravel} style={css("padding:5px 12px;font-size:12px")}>Exit</button>
      </div>
    </div>
  );
}
