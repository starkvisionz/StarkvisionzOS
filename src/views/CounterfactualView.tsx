import { css } from "../css";
import type { Vals } from "../os/deriveVals";
import { SimTag } from "../components/SimTag";

export function CounterfactualView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:760px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Counterfactual simulation</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>what would have happened if we'd chosen differently</span><SimTag /></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Branch from a historical decision and project the alternate outcome — change-impact analysis for software and AI decisions.</p>
        <div className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:12px;padding:13px 15px;margin-bottom:18px")}>
          <i className="ph ph-flow-arrow" style={css("font-size:18px;color:var(--color-accent-300)")} />
          <div style={css("flex:1;font-size:13.5px")}>What if we had chosen <b>React + FastAPI</b> instead of <b style={css("color:var(--color-accent-300)")}>Next.js + PostgreSQL</b>?</div>
          <button className="btn btn-primary" onClick={vals.runCounter} style={css("font-size:12.5px;gap:6px")}><i className={vals.cfBtnIcon} style={css(`font-size:14px;${vals.cfSpin}`)} />{vals.cfBtnLabel}</button>
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
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-flow-arrow" style={css("font-size:30px;color:var(--color-accent-300)")} /><div style={css("font-size:12.5px")}>Run the simulation to project the alternate outcome.</div></div>
        )}
      </div>
    </div>
  );
}
