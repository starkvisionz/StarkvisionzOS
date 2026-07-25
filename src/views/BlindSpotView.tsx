import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function BlindSpotView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:780px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Blind spot map</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>what the Hub knows it doesn't know</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 20px")}>The inverse of the memory graph. Every time an agent had to fill a gap with an assumption, the gap gets logged. Ranked by how often it was guessed and how much rides on it — silent hallucination pressure turned into a list you can close.</p>

        <div style={css("display:flex;align-items:center;gap:16px;padding:13px 16px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-divider);margin-bottom:20px")}>
          <div><div style={css("font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-accent-200)")}>{vals.blindOpen}</div><div style={css("font-size:11px;color:var(--color-neutral-600)")}>open gaps</div></div>
          <div style={css("width:1px;height:32px;background:var(--color-divider)")} />
          <div><div style={css("font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:#d68f9a")}>{vals.blindGuesses}</div><div style={css("font-size:11px;color:var(--color-neutral-600)")}>assumptions made this week</div></div>
          <div style={css("width:1px;height:32px;background:var(--color-divider)")} />
          <div><div style={css("font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-neutral-300)")}>{vals.blindClosed}</div><div style={css("font-size:11px;color:var(--color-neutral-600)")}>closed by you</div></div>
        </div>

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
                  <span style={css("font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>guessed {b.hits}× · rides on {b.rides}</span>
                  <div style={css("flex:1;max-width:150px;height:5px;border-radius:3px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${b.bar};background:${b.color}`)} /></div>
                  <button className="btn btn-ghost" onClick={b.onClose} style={css("margin-left:auto;font-size:11.5px;padding:3px 9px;gap:5px")}><i className={b.btnIcon} style={css("font-size:12px")} />{b.btnLabel}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
