import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function BlindSpotView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:780px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Blind spot map</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>Claude scans the real event log for what the Hub is quietly assuming</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 18px")}>Run a scan and Claude reads the recent event log — the same append-only events behind the timeline and audit — then surfaces the open questions the system is filling with assumptions, ranked by severity and by what depends on them. Answer or reopen each one; every scan is logged as an event.</p>

        {vals.blindError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.blindError}</span>
          </div>
        )}

        <div className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:13px;padding:14px 16px;margin-bottom:20px")}>
          <i className="ph-fill ph-radar" style={css("font-size:21px;color:#d6c07a")} />
          <div style={css("flex:1")}><div style={css("font-size:13.5px;font-weight:600")}>Blind-spot scan</div><div style={css("font-size:11.5px;color:var(--color-neutral-500)")}>{vals.blindHasReal ? vals.blindOpen + " open · " + vals.blindClosed + " closed by you · " + vals.blindGuesses + " surfaced" : "reads the recent event log and names the gaps"}</div></div>
          <button className="btn btn-primary" onClick={vals.runBlind} style={css("font-size:12.5px;gap:6px")}><i className={vals.blindBtnIcon} style={css(`font-size:14px;${vals.blindSpin}`)} />{vals.blindBtnLabel}</button>
        </div>

        {vals.blindHasReal && (
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {vals.blindSpots.map((b, i) => (
              <div key={i} style={css(`padding:13px 15px;border-radius:var(--radius-md);background:${b.surface};border:1px solid ${b.border};display:flex;gap:13px;align-items:flex-start;opacity:${b.op}`)}>
                <div style={css(`width:30px;height:30px;flex:none;border-radius:9px;background:${b.bg};display:grid;place-items:center`)}><i className={b.icon} style={css(`font-size:15px;color:${b.color}`)} /></div>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:4px")}>
                    <span style={css(`font-size:13px;font-weight:600;${b.strike}`)}>{b.q}</span>
                    <span className={b.tagClass} style={css("font-size:9.5px;padding:0 6px")}>{b.area}</span>
                  </div>
                  <div style={css("font-size:12.5px;color:var(--color-neutral-500);line-height:1.55")}>{b.assumed}</div>
                  <div style={css("display:flex;align-items:center;gap:13px;margin-top:8px")}>
                    <span style={css("font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{b.hasHits ? `guessed ${b.hits}× · ` : ""}rides on {b.rides}</span>
                    <div style={css("flex:1;max-width:150px;height:5px;border-radius:3px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${b.bar};background:${b.color}`)} /></div>
                    <button className="btn btn-ghost" onClick={b.onClose} style={css("margin-left:auto;font-size:11.5px;padding:3px 9px;gap:5px")}><i className={b.btnIcon} style={css("font-size:12px")} />{b.btnLabel}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {vals.blindEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-radar" style={css("font-size:30px;color:#d6c07a")} /><div style={css("font-size:12.5px;max-width:360px")}>Run a scan and Claude will read the recent event log and surface what the Hub is quietly assuming.</div></div>
        )}
      </div>
    </div>
  );
}
