import { css } from "../css";
import type { Vals } from "../os/deriveVals";
import { SimTag } from "../components/SimTag";

export function TruthDecayView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:760px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Truth decay</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>every claim has a half-life</span><SimTag /></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 18px")}>Each factual claim an agent shipped is stored with its source and a confidence half-life. As the world moves, confidence decays on its own — the Hub re-verifies against the live source instead of pretending an answer from March is still true.</p>

        <div style={css("display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:var(--radius-md);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 11%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-divider);margin-bottom:20px")}>
          <div style={css("flex:1")}>
            <div style={css("font-size:12px;color:var(--color-neutral-500);margin-bottom:5px")}>Ledger confidence · {vals.truthStale} claim(s) below threshold</div>
            <div style={css("height:9px;border-radius:5px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${vals.truthAvg};background:var(--color-accent);box-shadow:0 0 12px color-mix(in srgb,var(--color-accent) 45%,transparent)`)} /></div>
          </div>
          <div style={css("font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-accent-200)")}>{vals.truthAvg}</div>
          <button className="btn btn-primary" onClick={vals.reverifyAll} style={css("font-size:12.5px;gap:6px")}><i className="ph ph-arrows-counter-clockwise" style={css("font-size:14px")} />Re-verify stale</button>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:11px")}>
          {vals.claims.map((c, i) => (
            <div key={i} style={css(`padding:13px 15px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid ${c.border};display:flex;flex-direction:column;gap:9px`)}>
              <div style={css("display:flex;align-items:flex-start;gap:11px")}>
                <i className={c.icon} style={css(`font-size:17px;color:${c.color};margin-top:1px`)} />
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("font-size:13.5px;line-height:1.5;color:var(--color-neutral-200)")}>{c.text}</div>
                  <div style={css("display:flex;align-items:center;gap:9px;margin-top:5px;font-size:11px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}><i className={c.srcIcon} style={css("font-size:12px")} /><span>{c.source}</span><span>·</span><span>asserted {c.age}</span><span>·</span><span>half-life {c.half}</span></div>
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
      </div>
    </div>
  );
}
