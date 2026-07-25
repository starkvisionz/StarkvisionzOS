import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function NightshiftView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:740px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Nightshift</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>Claude reviews the real event log and files a brief</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 18px")}>Run a shift and Claude reads the recent event log — the same append-only events behind the timeline and audit views — then files a short morning brief: what it would answer, prune, or draft, and what to keep an eye on. Nothing is executed; drafted items wait for your approval.</p>

        {vals.nightError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.nightError}</span>
          </div>
        )}

        <div className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:13px;padding:14px 16px;margin-bottom:20px")}>
          <i className="ph-fill ph-moon-stars" style={css("font-size:22px;color:var(--color-accent)")} />
          <div style={css("flex:1")}><div style={css("font-size:13.5px;font-weight:600")}>Overnight review · reads the recent event log</div><div style={css("font-size:11.5px;color:var(--color-neutral-500)")}>{vals.nightStatus}</div></div>
          <button className="btn btn-primary" onClick={vals.runNight} style={css("font-size:12.5px;gap:6px")}><i className={vals.nightBtnIcon} style={css(`font-size:14px;${vals.nightSpin}`)} />{vals.nightBtnLabel}</button>
        </div>

        {vals.nightAny && (
          <div style={css("display:flex;flex-direction:column;gap:12px")}>
            <div style={css("font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600)")}>Morning brief</div>
            {vals.nightFindings.map((f, i) => (
              <div key={i} style={css(`display:flex;gap:13px;align-items:flex-start;padding:13px 15px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid ${f.border};box-shadow:${f.glow}`)}>
                <div style={css(`width:30px;height:30px;flex:none;border-radius:9px;background:${f.bg};display:grid;place-items:center`)}><i className={f.icon} style={css(`font-size:16px;color:${f.color}`)} /></div>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:3px")}><span style={css("font-size:13px;font-weight:600")}>{f.title}</span><span className={f.tagClass} style={css("font-size:9px;padding:0 6px")}>{f.kind}</span><span style={css("margin-left:auto;font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{f.at}</span></div>
                  <div style={css("font-size:12.5px;color:var(--color-neutral-400);line-height:1.55")}>{f.body}</div>
                  {f.needsApproval && (
                    <div style={css("display:flex;gap:7px;margin-top:9px")}><button className="btn btn-primary" style={css("font-size:11.5px;padding:3px 10px")}>Approve</button><button className="btn btn-ghost" style={css("font-size:11.5px;padding:3px 10px")}>Dismiss</button></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {vals.nightEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-moon-stars" style={css("font-size:30px;color:var(--color-accent-300)")} /><div style={css("font-size:12.5px;max-width:330px")}>Nothing on the desk yet. Run a shift to see what the Hub does with an idle night.</div></div>
        )}
      </div>
    </div>
  );
}
