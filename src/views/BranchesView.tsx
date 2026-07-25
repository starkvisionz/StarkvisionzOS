import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function BranchesView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:960px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Agent branches</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>fork one decision into parallel agent explorations</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 8px")}>Multiple agents build the same decision independently — the Hub compares cost, effort, risk and performance before you merge one into the main timeline.</p>
        <div style={css("font-size:13px;color:var(--color-neutral-300);margin-bottom:16px")}><i className="ph ph-git-fork" style={css("font-size:15px;color:var(--color-accent-300);vertical-align:-2px")} /> Decision: <b>primary datastore &amp; framework for the event hub</b></div>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:13px")}>
          {vals.branches.map((b, i) => (
            <div key={i} className="card elev-sm" style={css(`gap:11px;border:1px solid ${b.border}`)}>
              <div style={css("display:flex;align-items:center;gap:9px")}>
                <div style={css(`width:26px;height:26px;border-radius:7px;background:${b.badgeBg};display:grid;place-items:center;font-size:13px;font-weight:700;color:${b.badgeFg}`)}>{b.letter}</div>
                <div style={css("flex:1;min-width:0;font-size:13.5px;font-weight:600;font-family:var(--font-heading)")}>{b.title}</div>
                {b.recommended && <span className="tag tag-accent" style={css("font-size:8.5px;padding:1px 6px")}>BEST</span>}
              </div>
              <div style={css("font-size:11.5px;color:var(--color-neutral-500)")}><i className={b.agentIcon} style={css("font-size:13px;vertical-align:-2px")} /> built by {b.agent}</div>
              <div style={css("display:flex;flex-direction:column;gap:6px")}>
                {b.metrics.map((m, mi) => (
                  <div key={mi} style={css("display:flex;justify-content:space-between;font-size:12px")}><span style={css("color:var(--color-neutral-500)")}>{m.k}</span><span style={css(`color:${m.color};font-weight:600`)}>{m.v}</span></div>
                ))}
              </div>
              <button className={`btn ${b.btnClass}`} onClick={b.onMerge} style={css("font-size:12px;gap:6px")}><i className={b.btnIcon} style={css("font-size:14px")} />{b.btnLabel}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
