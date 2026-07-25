import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function AuditView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:960px;margin:0 auto")}>
        <div style={css("display:flex;align-items:flex-end;gap:12px;margin-bottom:8px")}>
          <h3 style={css("margin:0")}>Audit log</h3>
          <span style={css("font-size:12px;color:var(--color-neutral-500);margin-bottom:3px")}>append-only · never edited</span>
        </div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:560px;margin:0 0 20px")}>Every row is a raw event as ingested. Corrections are new events, not overwrites — the history is the source of truth the projections are built from.</p>
        <table className="table">
          <thead><tr><th>event_id</th><th>type</th><th>actor</th><th>ver</th><th>cost</th><th>approval</th></tr></thead>
          <tbody>
            {vals.auditRows.map((r, i) => (
              <tr key={i}>
                <td style={css("font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--color-neutral-400)")}>{r.id}</td>
                <td style={css("font-family:ui-monospace,Menlo,monospace;font-size:12px")}>{r.type}</td>
                <td style={css("color:var(--color-neutral-400)")}>{r.actor}</td>
                <td style={css("color:var(--color-neutral-500)")}>v{r.ver}</td>
                <td>{r.cost}</td>
                <td><span className={`tag ${r.apClass}`} style={css("font-size:9.5px")}>{r.approval}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
