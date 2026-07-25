import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function BranchesView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:960px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Agent branches</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>fork one decision into parallel Claude explorations</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 14px")}>Three Claude agents — pragmatic, robust, and lean — each draft an independent approach to the same decision. A judge marks one as best. Each draft's real token cost is shown, and forking is logged as an event.</p>

        {vals.branchError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.branchError}</span>
          </div>
        )}

        <div className="card elev-sm" style={css("gap:12px;padding:14px 16px;margin-bottom:18px")}>
          <div className="field">
            <label>Decision to explore</label>
            <input className="input" value={vals.branchTask} onChange={vals.onBranchTask} />
          </div>
          <div style={css("display:flex;align-items:center;gap:12px")}>
            <span style={css("font-size:11.5px;color:var(--color-neutral-500);display:inline-flex;align-items:center;gap:6px")}><i className="ph ph-git-fork" style={css("font-size:14px;color:var(--color-accent-300)")} />pragmatic · robust · lean</span>
            <button className="btn btn-primary" onClick={vals.runBranches} style={css("margin-left:auto;font-size:12.5px;gap:6px")}><i className={vals.branchBtnIcon} style={css(`font-size:14px;${vals.branchSpin}`)} />{vals.branchBtnLabel}</button>
          </div>
        </div>

        {vals.branchHasReal && vals.branchRationale && (
          <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:14px;font-size:12.5px;color:var(--color-neutral-300)")}><i className="ph-fill ph-seal-check" style={css("font-size:16px;color:var(--color-accent)")} /><span><b>Judge's pick:</b> {vals.branchRationale}</span></div>
        )}

        {vals.branchHasReal && (
          <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:13px")}>
            {vals.branches.map((b, i) => (
              <div key={i} className="card elev-sm" style={css(`gap:11px;border:1px solid ${b.border}`)}>
                <div style={css("display:flex;align-items:center;gap:9px")}>
                  <div style={css(`width:26px;height:26px;border-radius:7px;background:${b.badgeBg};display:grid;place-items:center;font-size:13px;font-weight:700;color:${b.badgeFg}`)}>{b.letter}</div>
                  <div style={css("flex:1;min-width:0;font-size:13.5px;font-weight:600;font-family:var(--font-heading)")}>{b.title}</div>
                  {b.recommended && <span className="tag tag-accent" style={css("font-size:8.5px;padding:1px 6px")}>BEST</span>}
                </div>
                <div style={css("font-size:11.5px;color:var(--color-neutral-500)")}><i className={b.agentIcon} style={css("font-size:13px;vertical-align:-2px")} /> {b.agent} agent</div>
                {b.summary && <div style={css("font-size:12px;line-height:1.5;color:var(--color-neutral-300)")}>{b.summary}</div>}
                <div style={css("display:flex;flex-direction:column;gap:6px")}>
                  {b.metrics.map((m, mi) => (
                    <div key={mi} style={css("display:flex;justify-content:space-between;font-size:12px")}><span style={css("color:var(--color-neutral-500)")}>{m.k}</span><span style={css(`color:${m.color};font-weight:600`)}>{m.v}</span></div>
                  ))}
                </div>
                <button className={`btn ${b.btnClass}`} onClick={b.onMerge} style={css("font-size:12px;gap:6px")}><i className={b.btnIcon} style={css("font-size:14px")} />{b.btnLabel}</button>
              </div>
            ))}
          </div>
        )}

        {vals.branchEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-git-branch" style={css("font-size:30px;color:var(--color-accent-300)")} /><div style={css("font-size:12.5px;max-width:360px")}>Set a decision and fork it — three Claude agents will each draft a different approach for you to compare and merge.</div></div>
        )}
      </div>
    </div>
  );
}
