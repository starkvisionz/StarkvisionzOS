import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function Sidebar({ vals }: { vals: Vals }) {
  return (
    <aside style={css("width:262px;flex:none;display:flex;flex-direction:column;background:#05060c;border-right:1px solid var(--color-divider)")}>
      {/* brand */}
      <div style={css("flex:none;display:flex;align-items:center;gap:9px;padding:16px 16px 12px")}>
        <div style={css("width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,var(--color-accent-500),var(--color-accent-700));display:grid;place-items:center;box-shadow:0 0 14px color-mix(in srgb,var(--color-accent) 45%,transparent)")}>
          <i className="ph-fill ph-hand-tap" style={css("font-size:15px;color:#12141f")} />
        </div>
        <span style={css("font-family:var(--font-heading);font-weight:600;font-size:14.5px;letter-spacing:-.01em")}>
          Starkvisionz<span style={css("color:var(--color-accent-300)")}> OS</span>
        </span>
        <span className="sim-tag" style={css("margin-left:auto")} title="Non-production prototype — all data and actions are simulated.">Prototype</span>
      </div>

      {/* project + repo selectors */}
      <div style={css("flex:none;padding:2px 12px 8px;position:relative")}>
        <div style={css("border:1px solid var(--color-divider);border-radius:var(--radius-md);overflow:hidden;background:color-mix(in srgb,var(--color-accent) 6%,transparent)")}>
          <div onClick={vals.toggleProj} className="oc-model-opt" style={css("display:flex;align-items:center;gap:9px;padding:8px 10px;cursor:pointer")}>
            <span style={css(`width:20px;height:20px;flex:none;border-radius:6px;background:${vals.projBg};display:grid;place-items:center`)}>
              <i className={vals.projIcon} style={css(`font-size:12px;color:${vals.projColor}`)} />
            </span>
            <div style={css("flex:1;min-width:0")}>
              <div style={css("font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-700)")}>Project</div>
              <div style={css("font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{vals.projName}</div>
            </div>
            <i className={vals.projCaret} style={css("font-size:12px;color:var(--color-neutral-500)")} />
          </div>
          <div style={css("height:1px;background:var(--color-divider)")} />
          <div onClick={vals.toggleRepo} className="oc-model-opt" style={css("display:flex;align-items:center;gap:9px;padding:8px 10px;cursor:pointer")}>
            <span style={css("width:20px;height:20px;flex:none;border-radius:6px;background:var(--color-neutral-800);display:grid;place-items:center")}>
              <i className="ph ph-git-branch" style={css("font-size:12px;color:var(--color-neutral-300)")} />
            </span>
            <div style={css("flex:1;min-width:0")}>
              <div style={css("font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-700)")}>Repo</div>
              <div style={css("font-size:12px;font-family:ui-monospace,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-neutral-200)")}>{vals.repoName}</div>
            </div>
            <span style={css(`font-size:9.5px;font-family:ui-monospace,Menlo,monospace;color:${vals.repoSyncColor};flex:none`)}>{vals.repoBranch}</span>
            <i className={vals.repoCaret} style={css("font-size:12px;color:var(--color-neutral-500)")} />
          </div>
        </div>

        {vals.projOpen && (
          <div className="elev-lg" style={css("position:absolute;left:12px;right:12px;top:100%;z-index:40;background:var(--color-surface);border:1px solid var(--color-accent-600);border-radius:var(--radius-md);padding:5px;margin-top:4px")}>
            <div style={css("padding:6px 8px 4px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-700)")}>Switch project</div>
            {vals.projList.map((p, i) => (
              <div key={i} onClick={p.onClick} className="oc-model-opt" style={css(`display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;background:${p.bg}`)}>
                <span style={css(`width:20px;height:20px;flex:none;border-radius:6px;background:${p.iconBg};display:grid;place-items:center`)}>
                  <i className={p.icon} style={css(`font-size:12px;color:${p.color}`)} />
                </span>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css(`font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${p.textColor}`)}>{p.name}</div>
                  <div style={css("font-size:10.5px;color:var(--color-neutral-600)")}>{p.meta}</div>
                </div>
                {p.active && <i className="ph-fill ph-check-circle" style={css("font-size:14px;color:var(--color-accent)")} />}
              </div>
            ))}
            <div style={css("height:1px;background:var(--color-divider);margin:5px 2px")} />
            <div className="oc-model-opt" style={css("display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:12.5px;color:var(--color-neutral-400)")}>
              <i className="ph ph-plus" style={css("font-size:14px;width:20px;text-align:center")} />New project
            </div>
          </div>
        )}

        {vals.repoOpen && (
          <div className="elev-lg" style={css("position:absolute;left:12px;right:12px;top:100%;z-index:40;background:var(--color-surface);border:1px solid var(--color-accent-600);border-radius:var(--radius-md);padding:5px;margin-top:4px")}>
            <div style={css("padding:6px 8px 4px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-700)")}>Repos in {vals.projName}</div>
            {vals.repoList.map((r, i) => (
              <div key={i} onClick={r.onClick} className="oc-model-opt" style={css(`display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;background:${r.bg}`)}>
                <span style={css(`width:7px;height:7px;flex:none;border-radius:50%;background:${r.dot}`)} />
                <div style={css("flex:1;min-width:0")}>
                  <div style={css(`font-size:12px;font-family:ui-monospace,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${r.textColor}`)}>{r.name}</div>
                  <div style={css("font-size:10.5px;color:var(--color-neutral-600)")}>{r.meta}</div>
                </div>
                <span style={css("font-size:9.5px;font-family:ui-monospace,Menlo,monospace;color:var(--color-neutral-500);flex:none")}>{r.branch}</span>
              </div>
            ))}
            <div style={css("height:1px;background:var(--color-divider);margin:5px 2px")} />
            <div className="oc-model-opt" style={css("display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:12.5px;color:var(--color-neutral-400)")}>
              <i className="ph ph-git-pull-request" style={css("font-size:14px;width:20px;text-align:center")} />Connect a repo
            </div>
          </div>
        )}
      </div>

      {/* new chat */}
      <div style={css("flex:none;padding:4px 12px 6px")}>
        <button className="btn btn-primary btn-block" style={css("justify-content:flex-start;gap:8px")} onClick={vals.newChat}>
          <i className="ph ph-plus" style={css("font-size:15px")} />New chat
        </button>
      </div>
      <div style={css("flex:none;padding:0 12px 8px")}>
        <div onClick={vals.openPalette} className="oc-model-opt" style={css("display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--color-divider);border-radius:var(--radius-md);cursor:pointer;color:var(--color-neutral-500);font-size:12.5px")}>
          <i className="ph ph-magnifying-glass" style={css("font-size:14px")} />Search &amp; commands
          <span style={css("margin-left:auto;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:var(--color-neutral-600);border:1px solid var(--color-divider);border-radius:4px;padding:0 4px")}>⌘K</span>
        </div>
      </div>

      <div className="oc-scroll" style={css("flex:1 1 0;min-height:0;overflow-y:auto")}>
        <nav style={css("padding:2px 8px;display:flex;flex-direction:column;gap:1px")}>
          {vals.navItems.map((item, i) => (
            <div key={i} className="oc-nav-item" onClick={item.onClick} style={css(`display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-md);cursor:pointer;font-size:13.5px;color:${item.color};background:${item.bg};box-shadow:${item.shadow};transition:background .15s,box-shadow .15s`)}>
              <i className={item.icon} style={css("font-size:16px")} />
              <span>{item.label}</span>
              {item.count && <span style={css("margin-left:auto;font-size:11px;color:var(--color-neutral-500)")}>{item.count}</span>}
            </div>
          ))}
        </nav>

        <div style={css("padding:11px 12px 3px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-700)")}>Lab</div>
        <nav style={css("padding:0 8px 2px;display:flex;flex-direction:column;gap:1px")}>
          {vals.labItems.map((item, i) => (
            <div key={i} className="oc-nav-item" onClick={item.onClick} style={css(`display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:var(--radius-md);cursor:pointer;font-size:12.5px;color:${item.color};background:${item.bg};box-shadow:${item.shadow};transition:background .15s,box-shadow .15s`)}>
              <i className={item.icon} style={css("font-size:15px")} /><span>{item.label}</span>
              {item.badge && <span className="tag tag-accent" style={css("margin-left:auto;font-size:8px;padding:0 5px")}>{item.badge}</span>}
            </div>
          ))}
        </nav>

        <div style={css("height:1px;margin:10px 14px;background:var(--color-divider)")} />

        <div style={css("padding:0 8px 8px")}>
          {vals.sessionGroups.map((grp, gi) => (
            <div key={gi}>
              <div style={css("padding:8px 8px 4px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600)")}>{grp.label}</div>
              {grp.items.map((sItem, si) => (
                <div key={si} className="oc-sess" onClick={sItem.onClick} style={css(`display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--radius-md);cursor:pointer;background:${sItem.bg};box-shadow:${sItem.shadow};margin-bottom:1px`)}>
                  <span style={css(`width:6px;height:6px;border-radius:50%;flex:none;background:${sItem.dot}`)} />
                  <span style={css(`flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:${sItem.color}`)}>{sItem.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* active now + budget */}
      <div style={css("flex:none;padding:9px 12px 4px;border-top:1px solid var(--color-divider)")}>
        <div style={css("display:flex;align-items:center;gap:6px;margin-bottom:8px")}>
          <span style={css("font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-700)")}>Active now</span>
          <span style={css("width:6px;height:6px;border-radius:50%;background:var(--color-accent);box-shadow:0 0 8px var(--color-accent);animation:ocpulse 1.4s ease-in-out infinite")} />
          <div style={css("display:flex;margin-left:auto")}>
            {vals.presence.map((p, i) => (
              <div key={i} style={css(`width:20px;height:20px;border-radius:50%;background:${p.bg};display:grid;place-items:center;box-shadow:0 0 0 2px #05060c;margin-left:-5px`)} title={p.name}>
                <i className={p.icon} style={css(`font-size:10px;color:${p.dot}`)} />
              </div>
            ))}
          </div>
        </div>
        <div style={css("display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--color-neutral-500);margin-bottom:4px")}>
          <span>Daily spend</span>
          <span style={css(`color:${vals.budgetColor}`)}>{vals.budgetSpent} / {vals.budgetCap}</span>
        </div>
        <div style={css("height:6px;border-radius:3px;background:var(--color-neutral-900);overflow:hidden")}>
          <div style={css(`height:100%;width:${vals.budgetPct};background:${vals.budgetBar};box-shadow:0 0 10px ${vals.budgetGlow};transition:width .3s`)} />
        </div>
      </div>

      {/* user footer */}
      <div style={css("flex:none;padding:9px 12px 10px;margin-top:6px;border-top:1px solid var(--color-divider);display:flex;align-items:center;gap:9px")}>
        <div style={css("width:28px;height:28px;border-radius:50%;background:var(--color-neutral-800);display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--color-neutral-200)")}>ES</div>
        <div style={css("flex:1;min-width:0")}>
          <div style={css("font-size:12.5px;line-height:1.2")}>Eric Stark</div>
          <div style={css("font-size:10.5px;color:var(--color-neutral-600)")}>3 providers linked</div>
        </div>
        <i className="ph ph-clock-counter-clockwise" onClick={vals.toggleTimeTravel} title="Time travel" style={css(`font-size:16px;color:${vals.ttColor};cursor:pointer`)} />
        <i className="ph ph-gear-six" onClick={vals.openSettings} style={css(`font-size:16px;color:${vals.gearColor};cursor:pointer`)} />
      </div>
    </aside>
  );
}
