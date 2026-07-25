import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function CommandPalette({ vals }: { vals: Vals }) {
  return (
    <div onClick={vals.closePalette} style={css("position:fixed;inset:0;background:color-mix(in srgb,#05060c 66%,transparent);display:flex;justify-content:center;align-items:flex-start;padding-top:12vh;z-index:80;backdrop-filter:blur(3px)")}>
      <div onClick={(e) => e.stopPropagation()} className="elev-lg" style={css("width:min(560px,92vw);background:var(--color-surface);border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--color-accent-600)")}>
        <div style={css("display:flex;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid var(--color-divider)")}>
          <i className="ph ph-magnifying-glass" style={css("font-size:17px;color:var(--color-accent-300)")} />
          <input
            ref={vals.setPaletteRef}
            value={vals.paletteQuery}
            onChange={vals.onPaletteQuery}
            placeholder="Search views, run actions…"
            style={css("flex:1;background:transparent;border:0;outline:none;color:var(--color-text);font-size:15px;font-family:var(--font-body)")}
          />
          <span style={css("font-family:ui-monospace,Menlo,monospace;font-size:10px;color:var(--color-neutral-600);border:1px solid var(--color-divider);border-radius:4px;padding:1px 5px")}>ESC</span>
        </div>
        <div className="oc-scroll" style={css("max-height:344px;overflow-y:auto;padding:6px")}>
          {vals.paletteItems.map((c, i) => (
            <div key={i} className="oc-model-opt" onClick={c.onRun} style={css("display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:var(--radius-sm);cursor:pointer")}>
              <i className={c.icon} style={css("font-size:16px;color:var(--color-accent-300);width:20px;text-align:center")} />
              <span style={css("flex:1;font-size:13.5px")}>{c.label}</span>
              <span style={css("font-size:10px;color:var(--color-neutral-600);text-transform:uppercase;letter-spacing:.06em")}>{c.kind}</span>
            </div>
          ))}
          {vals.paletteEmpty && <div style={css("padding:16px;text-align:center;font-size:12.5px;color:var(--color-neutral-600)")}>No matches</div>}
        </div>
      </div>
    </div>
  );
}
