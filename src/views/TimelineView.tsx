import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function TimelineView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:720px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:22px")}>
          <h3 style={css("margin:0")}>Project timeline</h3>
          <span style={css("font-size:12px;color:var(--color-neutral-500)")}>prj_stark_os · immutable event stream</span>

          <div style={css("margin-left:auto;display:flex;align-items:center;gap:10px")}>
            <span style={css(`display:inline-flex;align-items:center;gap:6px;font-size:11px;color:${vals.liveColor}`)}>
              <span style={css(`width:8px;height:8px;border-radius:50%;background:${vals.liveDot};animation:${vals.liveAnim};box-shadow:${vals.liveGlow}`)} />{vals.liveLabel}
            </span>
            <button className="btn btn-secondary" onClick={vals.toggleLive} style={css("gap:6px;padding:5px 10px;font-size:12px")}><i className={vals.liveIcon} style={css("font-size:13px")} />{vals.liveBtn}</button>
          </div>
        </div>
        <div style={css("position:relative;padding-left:26px")}>
          <div style={css("position:absolute;left:6px;top:4px;bottom:4px;width:1px;background:var(--color-divider)")} />
          {vals.events.map((e) => (
            <div key={e.id} style={css(`position:relative;padding:2px 8px 20px;margin-left:-8px;border-radius:6px;background:${e.freshBg};transition:background .7s ease`)}>
              <span style={css(`position:absolute;left:-16px;top:5px;width:11px;height:11px;border-radius:50%;background:var(--color-bg);border:2px solid ${e.dot}`)} />
              <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:3px")}>
                <i className={e.icon} style={css(`font-size:14px;color:${e.dot}`)} />
                <span style={css("font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--color-neutral-300)")}>{e.type}</span>
                <span style={css("font-size:11px;color:var(--color-neutral-600);margin-left:auto")}>{e.time}</span>
              </div>
              <div style={css("font-size:13px;color:var(--color-neutral-200);margin-bottom:3px")}>{e.summary}</div>
              <div style={css("display:flex;align-items:center;gap:10px;font-size:11px;color:var(--color-neutral-600)")}>
                <span><i className="ph ph-user-circle" style={css("font-size:12px;vertical-align:-2px")} /> {e.actor}</span>
                <span>{e.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
