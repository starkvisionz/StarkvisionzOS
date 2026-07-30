import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function MarketView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:900px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Agent market</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>models ranked by real usage from the event log</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Routing is an ROI decision, not brand loyalty. This leaderboard is computed from the immutable event log — real message volume, real spend, and real tokens per model the workspace has actually routed to. Route the next chat to any of them.</p>

        {vals.marketHasReal && (
          <table className="table">
            <thead><tr><th>Rank</th><th>Model</th><th>Messages</th><th>Spend</th><th>Avg / msg</th><th>Tokens</th><th></th></tr></thead>
            <tbody>
              {vals.marketRows.map((r, i) => (
                <tr key={i}>
                  <td><span style={css(`display:inline-flex;align-items:center;gap:6px;font-weight:600;color:${r.rankColor}`)}><i className={r.rankIcon} style={css("font-size:15px")} />{r.rank}</span></td>
                  <td><span style={css("display:inline-flex;align-items:center;gap:8px")}><span style={css(`width:9px;height:9px;border-radius:50%;background:${r.dot}`)} /><span><span style={css("display:block;line-height:1.2")}>{r.name}</span><span style={css("display:block;font-size:10.5px;color:var(--color-neutral-600)")}>{r.sub}</span></span></span></td>
                  <td style={css("font-weight:600")}>{r.messages}</td>
                  <td style={css("color:var(--color-neutral-400)")}>{r.spend}</td>
                  <td style={css("color:var(--color-neutral-400)")}>{r.avg}</td>
                  <td style={css("color:var(--color-neutral-400)")}>{r.tokens}</td>
                  <td><button className={`btn ${r.btnClass}`} onClick={r.onRoute} style={css("font-size:11.5px;padding:4px 10px")}>{r.btnLabel}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {vals.marketEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-trophy" style={css("font-size:30px;color:var(--color-accent-300)")} /><div style={css("font-size:12.5px;max-width:340px")}>No routing data yet. Send a chat message and each model you route to shows up here with its real usage and spend.</div></div>
        )}
      </div>
    </div>
  );
}
