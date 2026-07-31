import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function RecoveryView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:720px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Autonomous recovery</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>closed-loop deploy failure → verified fix</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Describe a failure and Claude runs a disciplined recovery — capture the last good state, diagnose the root cause, test an isolated fix, gate on approval, redeploy and verify — instead of an agent editing YAML until the error changes. Each run is logged as an event. (Claude reasons through the recovery; no live deploy is performed.)</p>

        {vals.recError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.recError}</span>
          </div>
        )}

        <div style={css("display:flex;flex-direction:column;gap:9px;padding:13px 15px;border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,var(--color-surface));border:1px solid color-mix(in srgb,#d68f9a 38%,transparent);margin-bottom:18px")}>
          <div style={css("display:flex;align-items:center;gap:9px")}>
            <i className="ph-fill ph-warning" style={css("font-size:18px;color:#d68f9a")} />
            <span style={css("font-size:12px;font-weight:600;color:#e5b0b8")}>The failure</span>
          </div>
          <textarea
            value={vals.recIncident}
            onChange={vals.onRecIncident}
            rows={3}
            placeholder="Describe the deploy or runtime failure — what broke, where, and any error text…"
            style={css("width:100%;box-sizing:border-box;resize:vertical;background:var(--color-bg);border:1px solid var(--color-divider);border-radius:var(--radius-sm);padding:9px 11px;color:var(--color-text);font-size:12.5px;font-family:var(--font-body);line-height:1.5;outline:none")}
          />
          <div style={css("display:flex;justify-content:flex-end")}>
            <button className="btn btn-primary" onClick={vals.runRecovery} style={css("font-size:12.5px;gap:6px")}><i className={vals.recBtnIcon} style={css(`font-size:14px;${vals.recSpin}`)} />{vals.recBtnLabel}</button>
          </div>
        </div>

        {vals.recHasReal && (
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
        )}

        {vals.recDone && vals.recResolved && (
          <div style={css("margin-top:6px;display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:var(--radius-md);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 15%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-accent-400);box-shadow:0 0 26px color-mix(in srgb,var(--color-accent) 20%,transparent)")}>
            <i className="ph-fill ph-check-circle" style={css("font-size:22px;color:var(--color-accent);flex:none")} />
            <div style={css("font-size:13.5px;font-weight:600")}>{vals.recSummary || "Recovered — production verified."}</div>
          </div>
        )}

        {vals.recDone && !vals.recResolved && (
          <div style={css("margin-top:6px;display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,var(--color-surface));border:1px solid color-mix(in srgb,#d68f9a 45%,transparent)")}>
            <i className="ph-fill ph-warning-octagon" style={css("font-size:22px;color:#d68f9a;flex:none")} />
            <div style={css("font-size:13.5px;font-weight:600;color:#e5b0b8")}>{vals.recSummary || "Could not fully resolve — escalating to a human."}</div>
          </div>
        )}

        {!vals.recHasReal && !vals.recError && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:12px;padding:44px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}>
            <i className="ph ph-heartbeat" style={css("font-size:30px;color:var(--color-accent-300)")} />
            <div style={css("font-size:12.5px;max-width:360px")}>Describe a failure above and Claude will run the closed-loop recovery — diagnosis, isolated fix, approval gate, redeploy, and verification — step by step.</div>
          </div>
        )}
      </div>
    </div>
  );
}
