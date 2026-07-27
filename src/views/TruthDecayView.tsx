import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function TruthDecayView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:760px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Truth decay</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>Claude surfaces the claims the workspace is relying on, and re-checks them</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 18px")}>Scan the real event log and Claude names the load-bearing factual claims the Hub is treating as true — each with a source, a confidence, and a half-life. Re-verify re-asks Claude to re-score a claim against the current log, so a stale answer stops pretending it's still fresh. Each scan is logged as an event.</p>

        {vals.truthError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.truthError}</span>
          </div>
        )}

        {vals.truthHasReal && (
          <div style={css("display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:var(--radius-md);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 11%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-divider);margin-bottom:20px")}>
            <div style={css("flex:1")}>
              <div style={css("font-size:12px;color:var(--color-neutral-500);margin-bottom:5px")}>Ledger confidence · {vals.truthStale} claim(s) below threshold</div>
              <div style={css("height:9px;border-radius:5px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${vals.truthAvg};background:var(--color-accent);box-shadow:0 0 12px color-mix(in srgb,var(--color-accent) 45%,transparent)`)} /></div>
            </div>
            <div style={css("font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-accent-200)")}>{vals.truthAvg}</div>
            <button className="btn btn-secondary" onClick={vals.reverifyAll} style={css("font-size:12.5px;gap:6px")}><i className="ph ph-arrows-counter-clockwise" style={css("font-size:14px")} />Re-verify stale</button>
            <button className="btn btn-primary" onClick={vals.runTruth} style={css("font-size:12.5px;gap:6px")}><i className={vals.truthBtnIcon} style={css(`font-size:14px;${vals.truthSpin}`)} />{vals.truthBtnLabel}</button>
          </div>
        )}

        {vals.truthHasReal && (
          <div style={css("display:flex;flex-direction:column;gap:11px")}>
            {vals.claims.map((c, i) => (
              <div key={i} style={css(`padding:13px 15px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid ${c.border};display:flex;flex-direction:column;gap:9px`)}>
                <div style={css("display:flex;align-items:flex-start;gap:11px")}>
                  <i className={c.icon} style={css(`font-size:17px;color:${c.color};margin-top:1px`)} />
                  <div style={css("flex:1;min-width:0")}>
                    <div style={css("font-size:13.5px;line-height:1.5;color:var(--color-neutral-200)")}>{c.text}</div>
                    <div style={css("display:flex;align-items:center;gap:9px;margin-top:5px;font-size:11px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}><i className={c.srcIcon} style={css("font-size:12px")} /><span>{c.source}</span><span>·</span><span>{c.age}</span><span>·</span><span>half-life {c.half}</span></div>
                  </div>
                  <div style={css("text-align:right;flex:none")}>
                    <div style={css(`font-size:15px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:${c.color}`)}>{c.conf}</div>
                    <div style={css("font-size:10px;color:var(--color-neutral-600);text-transform:uppercase;letter-spacing:.07em")}>{c.status}</div>
                  </div>
                </div>
                <div style={css("display:flex;align-items:center;gap:11px")}>
                  <div style={css("flex:1;height:6px;border-radius:4px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${c.conf};background:${c.color};transition:width .6s ease`)} /></div>
                  <button className="btn btn-ghost" onClick={c.onReverify} style={css("font-size:11.5px;padding:3px 9px;gap:5px")}><i className={c.btnIcon} style={css(`font-size:12px;${c.spin}`)} />{c.btnLabel}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {vals.truthEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}>
            <i className="ph ph-hourglass-medium" style={css("font-size:30px;color:var(--color-accent-300)")} />
            <div style={css("font-size:12.5px;max-width:360px")}>Scan the event log and Claude will surface the load-bearing claims the workspace is treating as true — each with a confidence you can re-verify.</div>
            <button className="btn btn-primary" onClick={vals.runTruth} style={css("font-size:12.5px;gap:6px")}><i className={vals.truthBtnIcon} style={css(`font-size:14px;${vals.truthSpin}`)} />{vals.truthBtnLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
}
