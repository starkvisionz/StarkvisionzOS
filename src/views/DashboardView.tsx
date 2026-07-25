import { css } from "../css";
import type { Vals } from "../os/deriveVals";
import { SimTag } from "../components/SimTag";

export function DashboardView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:960px;margin:0 auto")}>
        <div style={css("display:flex;align-items:flex-end;gap:12px;margin-bottom:20px")}>
          <h3 style={css("margin:0")}>Agent operations</h3>
          <span style={css("font-size:12px;color:var(--color-neutral-500);margin-bottom:3px")}>Live projection · rebuilt from the event store</span>
          <SimTag />
        </div>

        <div style={css("display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:26px")}>
          {vals.stats.map((st, i) => (
            <div key={i} className="card elev-sm">
              <div className="card-kicker">{st.kicker}</div>
              <div style={css("font-family:var(--font-heading);font-weight:600;font-size:27px;line-height:1")}>{st.value}</div>
              <div className="card-meta"><i className={st.icon} style={css("font-size:13px;color:var(--color-accent-300)")} />{st.meta}</div>
            </div>
          ))}
        </div>

        {/* stakes status strip */}
        <div onClick={vals.goRiskTab} className="oc-nav-item" style={css(`display:flex;align-items:center;gap:13px;padding:12px 16px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid ${vals.stakeBorder};margin-bottom:26px;cursor:pointer`)}>
          <i className="ph-fill ph-gauge" style={css(`font-size:19px;color:${vals.stakeColor}`)} />
          <div style={css("flex:1;min-width:0")}>
            <div style={css("font-size:13px")}><span style={css("color:var(--color-neutral-500)")}>Cost-of-being-wrong is set to</span> <b style={css(`color:${vals.stakeColor}`)}>{vals.stakeName}</b></div>
            <div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{vals.stakeSummary}</div>
          </div>
          <span style={css("font-size:13px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-neutral-300)")}>{vals.stakeCost}<span style={css("font-size:10.5px;color:var(--color-neutral-600)")}>/task</span></span>
          <i className="ph ph-caret-right" style={css("font-size:13px;color:var(--color-neutral-700)")} />
        </div>

        {/* spend + attention */}
        <div style={css("display:grid;grid-template-columns:1.35fr 1fr;gap:12px;margin-bottom:28px")}>
          <div className="card elev-sm" style={css("gap:13px")}>
            <div style={css("display:flex;align-items:baseline;gap:9px")}>
              <span style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600)")}>Spend · last 7 days</span>
              <span style={css("margin-left:auto;font-size:12px;color:var(--color-neutral-500)")}>{vals.spendTotal} total · {vals.spendTrend}</span>
            </div>
            <div style={css("display:flex;align-items:flex-end;gap:8px;height:104px")}>
              {vals.spendDays.map((d, i) => (
                <div key={i} style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end")}>
                  <div style={css("font-size:10px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{d.amt}</div>
                  <div style={css(`width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:${d.h}`)}>
                    <div style={css(`height:${d.reworkH};background:#d68f9a;border-radius:4px 4px 0 0;opacity:.85`)} />
                    <div style={css(`flex:1;background:linear-gradient(180deg,var(--color-accent-400),var(--color-accent-600));border-radius:${d.radius};box-shadow:0 0 14px color-mix(in srgb,var(--color-accent) 22%,transparent)`)} />
                  </div>
                  <div style={css(`font-size:10.5px;color:${d.labelColor}`)}>{d.day}</div>
                </div>
              ))}
            </div>
            <div style={css("display:flex;gap:16px;font-size:10.5px;color:var(--color-neutral-600)")}>
              <span style={css("display:inline-flex;align-items:center;gap:5px")}><span style={css("width:9px;height:9px;border-radius:3px;background:var(--color-accent-500)")} />productive</span>
              <span style={css("display:inline-flex;align-items:center;gap:5px")}><span style={css("width:9px;height:9px;border-radius:3px;background:#d68f9a")} />rework</span>
            </div>
          </div>

          <div className="card elev-sm" style={css("gap:9px")}>
            <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600)")}>Needs you</div>
            {vals.attention.map((at, i) => (
              <div key={i} className="oc-nav-item" onClick={at.onClick} style={css("display:flex;align-items:center;gap:10px;padding:8px 9px;margin:0 -9px;border-radius:var(--radius-md);cursor:pointer")}>
                <span style={css(`width:24px;height:24px;flex:none;border-radius:7px;background:${at.bg};display:grid;place-items:center`)}><i className={at.icon} style={css(`font-size:13px;color:${at.color}`)} /></span>
                <div style={css("flex:1;min-width:0")}><div style={css("font-size:12.5px;color:var(--color-neutral-200)")}>{at.label}</div><div style={css("font-size:10.5px;color:var(--color-neutral-600)")}>{at.sub}</div></div>
                <span style={css(`font-size:14px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:${at.color}`)}>{at.n}</span>
                <i className="ph ph-caret-right" style={css("font-size:12px;color:var(--color-neutral-700)")} />
              </div>
            ))}
          </div>
        </div>

        <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:11px")}>Agents</div>
        <div style={css("display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:28px")}>
          {vals.agents.map((ag, i) => (
            <div key={i} className="card elev-sm" style={css("gap:10px")}>
              <div style={css("display:flex;align-items:center;gap:10px")}>
                <div style={css(`width:30px;height:30px;border-radius:8px;background:${ag.bg};display:grid;place-items:center`)}><i className={ag.icon} style={css(`font-size:16px;color:${ag.fg}`)} /></div>
                <div style={css("flex:1")}><div style={css("font-size:14px;font-weight:600;font-family:var(--font-heading)")}>{ag.name}</div><div style={css("font-size:11px;color:var(--color-neutral-600)")}>{ag.role}</div></div>
                <span className={`tag ${ag.stateClass}`} style={css("font-size:9.5px")}>{ag.state}</span>
              </div>
              <div style={css("display:flex;gap:18px")}>
                <div><div style={css("font-size:10px;color:var(--color-neutral-600);text-transform:uppercase;letter-spacing:.07em")}>Trust</div><div style={css("font-size:15px;font-weight:600")}>{ag.trust}</div></div>
                <div><div style={css("font-size:10px;color:var(--color-neutral-600);text-transform:uppercase;letter-spacing:.07em")}>First-pass</div><div style={css("font-size:15px;font-weight:600")}>{ag.firstPass}</div></div>
                <div><div style={css("font-size:10px;color:var(--color-neutral-600);text-transform:uppercase;letter-spacing:.07em")}>Avg cost</div><div style={css("font-size:15px;font-weight:600")}>{ag.cost}</div></div>
              </div>
              <div style={css("height:5px;border-radius:3px;background:var(--color-neutral-900);overflow:hidden")}><div style={css(`height:100%;width:${ag.trustPct};background:linear-gradient(90deg,var(--color-accent-600),var(--color-accent-400))`)} /></div>
            </div>
          ))}
        </div>

        <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:6px")}>Recent tasks · cost attribution</div>
        <table className="table">
          <thead><tr><th>Task</th><th>Agent</th><th>AI cost</th><th>Human</th><th>Rework</th><th>Outcome</th></tr></thead>
          <tbody>
            {vals.tasks.map((t, i) => (
              <tr key={i}>
                <td>{t.name}</td>
                <td style={css("color:var(--color-neutral-400)")}>{t.agent}</td>
                <td>{t.cost}</td>
                <td style={css("color:var(--color-neutral-400)")}>{t.human}</td>
                <td>{t.rework}</td>
                <td><span className={`tag ${t.outClass}`} style={css("font-size:9.5px")}>{t.outcome}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
