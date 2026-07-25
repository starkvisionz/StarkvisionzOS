import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function NegotiationView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:780px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Negotiation room</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>for when scoring stops working</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:620px;margin:0 0 18px")}>Two agents deadlocked on a real trade-off will keep re-scoring the same answer forever. Here they stop scoring and start trading: each states what it wants and what it will give up, and the room records the concessions — so the final call comes with its price attached.</p>

        <div className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:13px;padding:14px 16px;margin-bottom:20px")}>
          <i className="ph-fill ph-handshake" style={css("font-size:21px;color:var(--color-accent)")} />
          <div style={css("flex:1")}><div style={css("font-size:13.5px;font-weight:600")}>Deadlock: ship the ingest rewrite Friday, or hold for the backfill?</div><div style={css("font-size:11.5px;color:var(--color-neutral-500)")}>{vals.negStatus}</div></div>
          <button className="btn btn-primary" onClick={vals.runNeg} style={css("font-size:12.5px;gap:6px")}><i className={vals.negBtnIcon} style={css(`font-size:14px;${vals.negSpin}`)} />{vals.negBtnLabel}</button>
        </div>

        {vals.negAny && (
          <div style={css("display:flex;flex-direction:column;gap:14px")}>
            {vals.negTurns.map((t, i) => (
              <div key={i} style={css(`display:flex;gap:12px;justify-content:${t.justify}`)}>
                <div style={css(`max-width:74%;display:flex;flex-direction:column;gap:6px;align-items:${t.align}`)}>
                  <div style={css(`display:flex;align-items:center;gap:7px;flex-direction:${t.dir}`)}><span style={css(`width:22px;height:22px;border-radius:7px;background:${t.bg};display:grid;place-items:center;box-shadow:0 0 12px ${t.glow}`)}><i className={t.icon} style={css(`font-size:12px;color:${t.color}`)} /></span><span style={css("font-size:11.5px;font-weight:600;color:var(--color-neutral-300)")}>{t.name}</span><span style={css("font-size:10px;color:var(--color-neutral-700);font-family:ui-monospace,Menlo,monospace")}>{t.role}</span></div>
                  <div style={css(`padding:11px 13px;border-radius:var(--radius-md);background:${t.bubble};border:1px solid ${t.border};font-size:13px;line-height:1.55;color:var(--color-neutral-200)`)}>{t.says}</div>
                  <div style={css(`display:flex;gap:7px;flex-wrap:wrap;justify-content:${t.justify}`)}>
                    {t.wants && <span className="tag tag-accent" style={css("font-size:10px")}><i className="ph ph-arrow-down-left" style={css("font-size:11px;margin-right:4px")} />wants: {t.wants}</span>}
                    {t.gives && <span className="tag tag-neutral" style={css("font-size:10px")}><i className="ph ph-arrow-up-right" style={css("font-size:11px;margin-right:4px")} />gives up: {t.gives}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {vals.negDeal && (
          <div style={css("margin-top:20px;padding:16px 18px;border-radius:var(--radius-lg);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 15%,var(--color-surface)),var(--color-surface));border:1px solid var(--color-accent-400);box-shadow:0 0 30px color-mix(in srgb,var(--color-accent) 18%,transparent)")}>
            <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:9px")}><i className="ph-fill ph-seal-check" style={css("font-size:19px;color:var(--color-accent)")} /><span style={css("font-size:13.5px;font-weight:600")}>Terms reached</span><span className="tag tag-accent" style={css("margin-left:auto;font-size:9.5px")}>3 concessions</span></div>
            <div style={css("font-size:13px;color:var(--color-neutral-300);line-height:1.6;margin-bottom:11px")}>Ship Friday behind a flag, dual-write for 48 hours, backfill runs Monday with the old path still readable. Forge gives up the clean cutover; Hermes gives up the pre-ship audit and takes a post-ship one instead.</div>
            <div style={css("font-size:11.5px;color:var(--color-neutral-500);border-left:2px solid var(--color-accent-500);padding-left:11px;line-height:1.55")}>Price of the deal: 48 hours of double writes and one week of two readable paths. Neither agent called this optimal — both called it acceptable.</div>
            <div style={css("display:flex;gap:7px;margin-top:13px")}><button className="btn btn-primary" style={css("font-size:12px;padding:4px 11px")}>Accept terms</button><button className="btn btn-ghost" style={css("font-size:12px;padding:4px 11px")}>Send back with a constraint</button></div>
          </div>
        )}

        {vals.negEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg);color:var(--color-neutral-600)")}><i className="ph ph-handshake" style={css("font-size:30px;color:var(--color-accent-300)")} /><div style={css("font-size:12.5px;max-width:340px")}>Open the room and the two agents will trade instead of re-scoring.</div></div>
        )}
      </div>
    </div>
  );
}
