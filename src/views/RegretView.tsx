import { css } from "../css";
import type { Vals } from "../os/deriveVals";
import { SimTag } from "../components/SimTag";

export function RegretView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:780px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Regret index</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>scored in hindsight, not at answer time</span><SimTag /></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 20px")}>Confidence is cheap — every agent is sure. Once the world returns a verdict, the Hub re-scores the decision against what actually happened. Regret is the gap between how sure it was and how right it turned out.</p>

        <div style={css("display:flex;gap:11px;margin-bottom:24px")}>
          {vals.regretAgents.map((a, i) => (
            <div key={i} style={css(`flex:1;padding:14px 15px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid ${a.border}`)}>
              <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:9px")}><span style={css(`width:22px;height:22px;border-radius:7px;background:${a.bg};display:grid;place-items:center`)}><i className={a.icon} style={css(`font-size:12px;color:${a.color}`)} /></span><span style={css("font-size:12.5px;font-weight:600")}>{a.name}</span></div>
              <div style={css("display:flex;align-items:baseline;gap:6px")}><span style={css(`font-size:26px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:${a.color}`)}>{a.regret}</span><span style={css("font-size:11px;color:var(--color-neutral-600)")}>regret</span></div>
              <div style={css("height:6px;border-radius:4px;background:var(--color-neutral-900);overflow:hidden;margin:8px 0 7px")}><div style={css(`height:100%;width:${a.bar};background:${a.color}`)} /></div>
              <div style={css("font-size:11px;color:var(--color-neutral-600)")}>{a.note}</div>
            </div>
          ))}
        </div>

        <div style={css("font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:11px")}>Scored decisions</div>
        <div style={css("display:flex;flex-direction:column;gap:10px")}>
          {vals.regretRows.map((r, i) => (
            <div key={i} style={css(`padding:13px 15px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid ${r.border}`)}>
              <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:7px")}>
                <i className={r.icon} style={css(`font-size:16px;color:${r.color}`)} />
                <span style={css("font-size:13px;font-weight:600;flex:1;min-width:0")}>{r.decision}</span>
                <span style={css("font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{r.by} · {r.when}</span>
              </div>
              <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-left:25px")}>
                <div><div style={css("font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--color-neutral-700);margin-bottom:3px")}>Claimed then</div><div style={css("font-size:12.5px;color:var(--color-neutral-400);line-height:1.5")}>{r.claimed}</div></div>
                <div><div style={css("font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--color-neutral-700);margin-bottom:3px")}>Happened</div><div style={css("font-size:12.5px;color:var(--color-neutral-300);line-height:1.5")}>{r.actual}</div></div>
              </div>
              <div style={css("display:flex;align-items:center;gap:11px;margin:10px 0 0 25px")}>
                <span style={css("font-size:11px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>confidence {r.conf} → outcome {r.outcome}</span>
                <span style={css(`margin-left:auto;font-size:12px;font-weight:600;color:${r.color};font-family:ui-monospace,Menlo,monospace`)}>{r.gap}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
