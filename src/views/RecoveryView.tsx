import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function RecoveryView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:720px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Autonomous recovery</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>closed-loop deploy failure → verified fix</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>When a deploy fails the Hub captures the last good state, diagnoses, tests a fix in isolation, requests approval, redeploys and verifies — instead of an agent editing YAML until the error changes.</p>
        <div style={css("display:flex;align-items:center;gap:11px;padding:12px 15px;border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 14%,var(--color-surface));border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);margin-bottom:18px")}>
          <i className="ph-fill ph-warning" style={css("font-size:20px;color:#d68f9a")} />
          <div style={css("flex:1")}><div style={css("font-size:13.5px;font-weight:600")}>Deploy 37 failed on Coolify</div><div style={css("font-size:11.5px;color:var(--color-neutral-500)")}>missing env reference · detected 21:22</div></div>
          <button className="btn btn-primary" onClick={vals.runRecovery} style={css("font-size:12.5px;gap:6px")}><i className={vals.recBtnIcon} style={css(`font-size:14px;${vals.recSpin}`)} />{vals.recBtnLabel}</button>
        </div>
        <div style={css("position:relative;padding-left:26px")}>
          <div style={css("position:absolute;left:8px;top:6px;bottom:6px;width:2px;background:var(--color-divider)")} />
          {vals.recSteps.map((s, i) => (
            <div key={i} style={css("position:relative;padding-bottom:16px;display:flex;align-items:flex-start;gap:11px")}>
              <span style={css(`position:absolute;left:-23px;top:1px;width:17px;height:17px;border-radius:50%;background:var(--color-bg);border:2px solid ${s.ring};display:grid;place-items:center`)}><i className={s.icon} style={css(`font-size:9px;color:${s.iconColor};${s.spin}`)} /></span>
              <div style={css("flex:1")}><div style={css(`font-size:13px;color:${s.textColor}`)}>{s.label}</div>{s.detail && <div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{s.detail}</div>}</div>
              <span style={css(`font-size:10px;color:${s.tagColor};font-family:ui-monospace,Menlo,monospace`)}>{s.status}</span>
            </div>
          ))}
        </div>
        {vals.recDone && (
          <div style={css("margin-top:6px;display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:var(--radius-md);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 15%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-accent-400);box-shadow:0 0 26px color-mix(in srgb,var(--color-accent) 20%,transparent)")}>
            <i className="ph-fill ph-check-circle" style={css("font-size:22px;color:var(--color-accent)")} />
            <div style={css("font-size:13.5px;font-weight:600")}>Recovered — deploy 38 healthy · production verified in 3m 12s</div>
          </div>
        )}
      </div>
    </div>
  );
}
