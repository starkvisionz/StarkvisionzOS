import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function CounterfactualView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:760px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Counterfactual simulation</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>Claude projects what choosing differently would have cost</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Name the option you chose and the road not taken. Claude projects the alternate outcome as change-impact analysis — metric by metric, with a verdict on whether the call held up. Every run is logged as an event.</p>

        {vals.cfError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.cfError}</span>
          </div>
        )}

        <div className="card elev-sm" style={css("gap:12px;padding:14px 16px;margin-bottom:18px")}>
          <div className="field">
            <label>Chosen (baseline)</label>
            <input className="input" value={vals.cfDecision} onChange={vals.onCfDecision} />
          </div>
          <div className="field">
            <label>Alternative (counterfactual)</label>
            <input className="input" value={vals.cfAlternative} onChange={vals.onCfAlternative} />
          </div>
          <div style={css("display:flex;align-items:center")}>
            <span style={css("font-size:11.5px;color:var(--color-neutral-500);display:inline-flex;align-items:center;gap:6px")}><i className="ph ph-flow-arrow" style={css("font-size:14px;color:var(--color-accent-300)")} />projected across the metrics that matter</span>
            <button className="btn btn-primary" onClick={vals.runCounter} style={css("margin-left:auto;font-size:12.5px;gap:6px")}><i className={vals.cfBtnIcon} style={css(`font-size:14px;${vals.cfSpin}`)} />{vals.cfBtnLabel}</button>
          </div>
        </div>

        {vals.cfDone && (
          <div style={css("display:flex;flex-direction:column;gap:15px")}>
            <div style={css("display:flex;gap:20px;font-size:11.5px")}>
              <span style={css("display:inline-flex;align-items:center;gap:6px")}><span style={css("width:10px;height:10px;border-radius:3px;background:var(--color-accent)")} />Baseline (chosen)</span>
              <span style={css("display:inline-flex;align-items:center;gap:6px")}><span style={css("width:10px;height:10px;border-radius:3px;background:var(--color-neutral-500)")} />Counterfactual</span>
            </div>
            {vals.cfMetrics.map((m, i) => (
              <div key={i}>
                <div style={css("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px")}><span style={css("color:var(--color-neutral-300)")}>{m.k}</span><span style={css(`color:${m.deltaColor};font-weight:600`)}>{m.delta}</span></div>
                <div style={css("display:flex;flex-direction:column;gap:4px")}>
                  <div style={css("height:9px;border-radius:5px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${m.baseW};background:var(--color-accent);box-shadow:0 0 10px color-mix(in srgb,var(--color-accent) 40%,transparent)`)} /></div>
                  <div style={css("height:9px;border-radius:5px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${m.altW};background:var(--color-neutral-500)`)} /></div>
                </div>
                <div style={css("display:flex;justify-content:space-between;font-size:10.5px;color:var(--color-neutral-600);margin-top:3px")}><span>{m.baseV}</span><span>{m.altV}</span></div>
              </div>
            ))}
            <div style={css("font-size:12.5px;color:var(--color-neutral-400);line-height:1.55;border-left:2px solid var(--color-accent-500);padding-left:12px")}>{vals.cfVerdict}</div>
          </div>
        )}
        {vals.cfPending && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-flow-arrow" style={css("font-size:30px;color:var(--color-accent-300)")} /><div style={css("font-size:12.5px")}>Name both options and run the simulation to project the alternate outcome.</div></div>
        )}
      </div>
    </div>
  );
}
