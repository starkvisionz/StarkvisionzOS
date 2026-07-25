import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function LibraryView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:960px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}>
          <h3 style={css("margin:0")}>Document library</h3>
          <span style={css("font-size:12px;color:var(--color-neutral-500)")}>artifacts · MinIO · every version linked to its source event</span>
        </div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:580px;margin:0 0 18px")}>Documents, decision records and artifacts produced across every agent and session. Each is versioned and traces back to the event that created it.</p>
        <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:18px")}>
          <div style={css("position:relative;flex:1;max-width:340px")}>
            <i className="ph ph-magnifying-glass" style={css("position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--color-neutral-600)")} />
            <input className="input" placeholder="Search artifacts, decisions, versions…" style={css("padding-left:32px")} />
          </div>
          <span className="tag tag-neutral" style={css("font-size:10px")}>{vals.artifactCount} items</span>
          <button className="btn btn-primary" style={css("margin-left:auto;gap:6px")}><i className="ph ph-upload-simple" style={css("font-size:15px")} />Add document</button>
        </div>
        <div style={css("display:grid;grid-template-columns:repeat(2,1fr);gap:12px")}>
          {vals.artifacts.map((a, i) => (
            <div key={i} className="card elev-sm" style={css("gap:11px;cursor:pointer")}>
              <div style={css("display:flex;align-items:center;gap:11px")}>
                <div style={css(`width:36px;height:36px;flex:none;border-radius:8px;background:${a.bg};display:grid;place-items:center`)}><i className={a.icon} style={css(`font-size:18px;color:${a.fg}`)} /></div>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("font-size:14px;font-weight:600;font-family:var(--font-heading);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{a.title}</div>
                  <div style={css("font-size:11px;color:var(--color-neutral-600)")}>{a.type} · v{a.ver}</div>
                </div>
                <i className="ph ph-dots-three-vertical" style={css("font-size:16px;color:var(--color-neutral-600)")} />
              </div>
              <div style={css("display:flex;align-items:center;gap:12px;font-size:11px;color:var(--color-neutral-500)")}>
                <span style={css("display:inline-flex;align-items:center;gap:4px")}><i className="ph ph-user-circle" style={css("font-size:13px")} />{a.source}</span>
                <span>{a.size}</span>
                <span style={css("margin-left:auto")}><i className="ph ph-clock" style={css("font-size:12px;vertical-align:-2px")} /> {a.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
