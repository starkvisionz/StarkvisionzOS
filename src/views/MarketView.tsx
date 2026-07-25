import { css } from "../css";
import type { Vals } from "../os/deriveVals";
import { SimTag } from "../components/SimTag";

export function MarketView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:900px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Agent market</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>agents ranked by real results, per category</span><SimTag /></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Routing is an ROI decision, not brand loyalty. The Hub ranks agents by verified success, cost and latency — the top agent wins the work.</p>
        <div style={css("display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap")}>
          {vals.marketCats.map((c, i) => (
            <div key={i} onClick={c.onSelect} style={css(`padding:6px 13px;border-radius:20px;font-size:12.5px;cursor:pointer;background:${c.bg};color:${c.color};border:1px solid ${c.border}`)}>{c.label}</div>
          ))}
        </div>
        <table className="table">
          <thead><tr><th>Rank</th><th>Agent</th><th>Success</th><th>Avg cost</th><th>Latency</th><th></th></tr></thead>
          <tbody>
            {vals.marketRows.map((r, i) => (
              <tr key={i}>
                <td><span style={css(`display:inline-flex;align-items:center;gap:6px;font-weight:600;color:${r.rankColor}`)}><i className={r.rankIcon} style={css("font-size:15px")} />{r.rank}</span></td>
                <td><span style={css("display:inline-flex;align-items:center;gap:8px")}><span style={css(`width:9px;height:9px;border-radius:50%;background:${r.dot}`)} />{r.name}</span></td>
                <td style={css("font-weight:600")}>{r.success}</td>
                <td style={css("color:var(--color-neutral-400)")}>{r.cost}</td>
                <td style={css("color:var(--color-neutral-400)")}>{r.latency}</td>
                <td><button className={`btn ${r.btnClass}`} style={css("font-size:11.5px;padding:4px 10px")}>{r.btnLabel}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
