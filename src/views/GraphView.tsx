import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function GraphView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:1060px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Memory graph</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>the organizational memory, queryable</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:640px;margin:0 0 16px")}>Not a chat history — a graph built from the real event log. Every conversation thread and every Lab activity that actually happened is a node, and every edge is the real chronology or the thread that was live when the activity ran. Ask it why something exists and Claude walks the chain back through the events that caused it.</p>

        {vals.gqError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:14px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.gqError}</span>
          </div>
        )}

        <div style={css("display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:var(--radius-md);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 11%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-accent-600);margin-bottom:14px")}>
          <i className="ph ph-magnifying-glass" style={css("font-size:17px;color:var(--color-accent-300)")} />
          <input value={vals.gqValue} onChange={vals.onGq} placeholder="Ask the graph — why does the datastore decision exist?" style={css("flex:1;background:transparent;border:0;outline:none;color:var(--color-text);font-size:13.5px;font-family:var(--font-body)")} />
          <button className="btn btn-primary" onClick={vals.runGq} style={css("font-size:12px;padding:4px 11px;gap:5px")}><i className={vals.gqBtnIcon} style={css(`font-size:13px;${vals.gqSpin}`)} />Trace</button>
        </div>

        {vals.gqAnswered && (
          <div style={css("padding:14px 16px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-accent-500);box-shadow:0 0 26px color-mix(in srgb,var(--color-accent) 14%,transparent);margin-bottom:16px")}>
            <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:9px")}><i className="ph-fill ph-path" style={css("font-size:16px;color:var(--color-accent)")} /><span style={css("font-size:12.5px;font-weight:600")}>{vals.gqTitle}</span><span style={css("margin-left:auto;font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{vals.gqHops}</span></div>
            <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px")}>
              {vals.gqPath.map((p, i) => (
                <span key={i} style={css("display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                  <span style={css(`display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:var(--radius-sm);background:${p.bg};border:1px solid ${p.border};font-size:11.5px;color:var(--color-neutral-200)`)}><i className={p.icon} style={css(`font-size:12px;color:${p.color}`)} />{p.label}</span>
                  {p.arrow && <i className="ph ph-arrow-right" style={css("font-size:12px;color:var(--color-neutral-700)")} />}
                </span>
              ))}
            </div>
            <div style={css("font-size:13px;color:var(--color-neutral-300);line-height:1.6")}>{vals.gqAnswer}</div>
          </div>
        )}

        {vals.graphEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}>
            <i className="ph ph-share-network" style={css("font-size:30px;color:var(--color-accent-300)")} />
            <div style={css("font-size:12.5px;max-width:380px")}>The graph builds itself from the event log. Start a conversation or run a Lab tool (a loop, a replay, a scan) and the threads and activities will appear here as nodes, wired by the real chronology.</div>
          </div>
        )}

        {vals.graphHasReal && (
        <>
        <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap")}>
          {vals.graphFilters.map((f, i) => (
            <div key={i} onClick={f.onClick} className="oc-model-opt" style={css(`display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:999px;cursor:pointer;font-size:12px;background:${f.bg};border:1px solid ${f.border};color:${f.color}`)}>
              <span style={css(`width:8px;height:8px;border-radius:50%;background:${f.dot}`)} />{f.label}<span style={css("color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace;font-size:11px")}>{f.n}</span>
            </div>
          ))}
          <div style={css("margin-left:auto;display:flex;align-items:center;gap:9px")}>
            <span style={css("font-size:11.5px;color:var(--color-neutral-600)")}>Depth</span>
            <input type="range" min={1} max={3} step={1} value={vals.depthVal} onChange={vals.onDepth} style={css("width:78px;accent-color:var(--color-accent)")} />
            <span style={css("font-size:11.5px;color:var(--color-accent-200);font-family:ui-monospace,Menlo,monospace")}>{vals.depthVal} hop</span>
          </div>
        </div>

        <div style={css("display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap")}>
          <div style={css("flex:3 1 440px;min-width:0;background:radial-gradient(120% 90% at 30% 20%,color-mix(in srgb,var(--color-accent) 7%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-divider);border-radius:var(--radius-lg);padding:8px")}>
            <div style={css("position:relative")}>
              <svg viewBox="0 0 620 430" style={css("width:100%;height:auto;display:block")}>
                {vals.graphEdges.map((e, i) => (
                  <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.stroke} strokeWidth={e.w} strokeDasharray={e.dash} />
                ))}
                {vals.graphNodes.map((n, i) => (
                  <g key={i} onClick={n.onClick} style={css(`cursor:pointer;opacity:${n.op}`)}>
                    {n.halo && <circle cx={n.x} cy={n.y} r={n.haloR} fill={n.haloFill} />}
                    <circle cx={n.x} cy={n.y} r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} />
                  </g>
                ))}
              </svg>
              <div style={css("position:absolute;inset:0;pointer-events:none")}>
                {vals.graphEdges.map((e, i) =>
                  e.label ? (
                    <div key={`el${i}`} style={css(`position:absolute;left:${e.lx};top:${e.lyPct};transform:translate(-50%,-50%);font-size:8.5px;color:var(--color-accent-200);background:color-mix(in srgb,var(--color-bg) 82%,transparent);padding:0 3px;border-radius:3px;white-space:nowrap`)}>{e.label}</div>
                  ) : null,
                )}
                {vals.graphNodes.map((n, i) => (
                  <span key={`nl${i}`}>
                    <div onClick={n.onClick} style={css(`position:absolute;left:${n.leftPct};top:${n.topPct};transform:translate(-50%,-50%);font-size:9px;font-weight:600;font-family:ui-monospace,Menlo,monospace;letter-spacing:.04em;color:${n.iconFill};line-height:1;white-space:nowrap;opacity:${n.op};pointer-events:auto;cursor:pointer`)}>{n.glyph}</div>
                    <div onClick={n.onClick} style={css(`position:absolute;left:${n.leftPct};top:${n.labelTopPct};transform:translateX(-50%);text-align:center;white-space:nowrap;opacity:${n.op};pointer-events:auto;cursor:pointer`)}>
                      <div style={css(`font-size:10px;color:${n.textFill};line-height:1.3`)}>{n.label}</div>
                      {n.sub && <div style={css("font-size:8.5px;color:var(--color-neutral-600);line-height:1.25")}>{n.sub}</div>}
                    </div>
                  </span>
                ))}
              </div>
            </div>
            <div style={css("display:flex;align-items:center;gap:14px;padding:8px 6px 3px;font-size:10.5px;color:var(--color-neutral-600)")}>
              <span>{vals.graphCount}</span>
              <span style={css("display:inline-flex;align-items:center;gap:5px")}><span style={css("width:14px;height:2px;background:var(--color-accent-500)")} />event link</span>
              <span style={css("margin-left:auto")}>node size = how connected it is</span>
            </div>
          </div>

          <div style={css("flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:12px")}>
            <div className="card elev-sm" style={css("gap:10px;border:1px solid var(--color-accent-600)")}>
              <div style={css("display:flex;align-items:center;gap:8px")}>
                <span style={css(`width:24px;height:24px;border-radius:7px;background:${vals.selBg};display:grid;place-items:center`)}><i className={vals.selIcon} style={css(`font-size:13px;color:${vals.selColor}`)} /></span>
                <div className="card-kicker" style={css("margin:0")}>{vals.graphSelType}</div>
                <span className={vals.selTagClass} style={css("margin-left:auto;font-size:9px;padding:0 6px")}>{vals.selConf}</span>
              </div>
              <div className="card-title" style={css("margin:0")}>{vals.graphSelTitle}</div>
              <div style={css("font-size:12.5px;color:var(--color-neutral-400);line-height:1.55")}>{vals.graphSelNote}</div>

              <div style={css("display:flex;gap:14px;padding:9px 0;border-top:1px solid var(--color-divider);border-bottom:1px solid var(--color-divider)")}>
                {vals.selStats.map((s, i) => (
                  <div key={i}><div style={css("font-size:15px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-neutral-200)")}>{s.v}</div><div style={css("font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--color-neutral-600)")}>{s.k}</div></div>
                ))}
              </div>

              <div style={css("font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-600)")}>Provenance</div>
              <div style={css("display:flex;flex-direction:column;gap:6px")}>
                {vals.selProv.map((p, i) => (
                  <div key={i} style={css("display:flex;gap:8px;align-items:flex-start")}><i className={p.icon} style={css("font-size:13px;color:var(--color-accent-300);margin-top:2px")} /><div style={css("flex:1")}><div style={css("font-size:11.5px;color:var(--color-neutral-300)")}>{p.label}</div><div style={css("font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{p.meta}</div></div></div>
                ))}
              </div>

              <div style={css("font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-600);margin-top:2px")}>Connected to</div>
              <div style={css("display:flex;flex-direction:column;gap:5px")}>
                {vals.graphSelLinks.map((l, i) => (
                  <div key={i} className="oc-nav-item" onClick={l.onClick} style={css("display:flex;align-items:center;gap:8px;font-size:12px;color:var(--color-neutral-300);padding:4px 6px;margin:0 -6px;border-radius:var(--radius-sm);cursor:pointer")}>
                    <i className={l.icon} style={css("font-size:13px;color:var(--color-accent-300)")} /><span style={css("flex:1;min-width:0")}>{l.label}</span><span style={css("font-size:10px;color:var(--color-neutral-700);font-family:ui-monospace,Menlo,monospace")}>{l.rel}</span>
                  </div>
                ))}
              </div>

              <div style={css("display:flex;gap:6px;margin-top:4px")}>
                <button className="btn btn-primary" onClick={vals.askWhy} style={css("flex:1;gap:6px;font-size:12px;padding:5px 8px")}><i className="ph ph-chat-teardrop-text" style={css("font-size:14px")} />Ask why</button>
                <button className="btn btn-ghost" style={css("font-size:12px;padding:5px 9px")}><i className="ph ph-clock-counter-clockwise" style={css("font-size:14px")} /></button>
              </div>
            </div>

            <div className="card elev-sm" style={css("gap:8px")}>
              <div style={css("font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-600)")}>Graph health</div>
              {vals.graphHealth.map((g, i) => (
                <div key={i} style={css("display:flex;align-items:center;gap:9px")}>
                  <i className={g.icon} style={css(`font-size:14px;color:${g.color};width:16px`)} />
                  <span style={css("flex:1;font-size:11.5px;color:var(--color-neutral-400)")}>{g.label}</span>
                  <span style={css(`font-size:12px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:${g.color}`)}>{g.v}</span>
                </div>
              ))}
              <div style={css("font-size:11px;color:var(--color-neutral-600);line-height:1.5;margin-top:2px")}>Every edge here is backed by a real event — the graph has no assumed links. Threads are the conversations; the ring around them is the Lab activity that ran during each.</div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
