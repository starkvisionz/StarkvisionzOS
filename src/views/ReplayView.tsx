import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function ReplayView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:900px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Model replay</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>re-run your last real turn through another model</span></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Takes the most recent real user prompt from Chat, replays it through a different Claude model, streams the new answer, and has a model diff the two — with the real token cost of each. Every replay is logged as an event.</p>

        {vals.replayError && (
          <div style={css("display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:16px;border:1px solid color-mix(in srgb,#d68f9a 40%,transparent);border-radius:var(--radius-md);background:color-mix(in srgb,#d68f9a 12%,transparent);color:#e5b0b8;font-size:12.5px")}>
            <i className="ph ph-warning-octagon" style={css("font-size:16px;flex:none")} />
            <span>{vals.replayError}</span>
          </div>
        )}

        <div className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:12px;padding:12px 15px;margin-bottom:16px")}>
          <i className="ph ph-git-fork" style={css("font-size:18px;color:var(--color-accent-300)")} />
          <div style={css("flex:1;min-width:0")}>
            <div style={css("font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{vals.replayHasOrig ? vals.replayPromptShort : "Last chat turn"}</div>
            <div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{vals.replayHasOrig ? "original answer · " + vals.replayOrigModel : "the most recent real user prompt from Chat"}</div>
          </div>
          <button className="btn btn-primary" onClick={vals.runReplay} style={css("font-size:12.5px;gap:6px")}><i className={vals.replayBtnIcon} style={css(`font-size:14px;${vals.replaySpin}`)} />{vals.replayBtnLabel}</button>
        </div>

        {vals.replayHasOrig && (
          <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
            <div className="card elev-sm" style={css("gap:8px")}>
              <div className="card-kicker" style={css("color:var(--color-neutral-500)")}>Original · {vals.replayOrigModel}</div>
              <div style={css("font-size:13px;line-height:1.55;color:var(--color-neutral-300);white-space:pre-wrap")}>{vals.replayOrigContent}</div>
              <div className="card-meta"><span>cost {vals.replayOrigCost}</span></div>
            </div>

            <div className="card elev-sm" style={css(`gap:8px;${vals.replayDone ? "border:1px solid var(--color-accent-500);box-shadow:0 0 24px color-mix(in srgb,var(--color-accent) 20%,transparent)" : ""}`)}>
              <div className="card-kicker">Replayed{vals.replayNewModel ? " · " + vals.replayNewModel : ""}</div>
              <div style={css("font-size:13px;line-height:1.55;color:var(--color-neutral-200);white-space:pre-wrap")}>
                {vals.replayNewText}
                {vals.replayStreaming && <span style={css("display:inline-block;width:7px;height:14px;background:var(--color-accent);margin-left:2px;vertical-align:text-bottom;animation:ocblink 1s step-end infinite")} />}
              </div>
              {vals.replayDone && vals.replayDiffs.length > 0 && (
                <div style={css("display:flex;flex-direction:column;gap:4px;margin-top:2px")}>
                  {vals.replayDiffs.map((d, i) => (
                    <div key={i} style={css(`display:flex;align-items:flex-start;gap:7px;font-size:11.5px;line-height:1.45;color:${d.color}`)}><i className={d.icon} style={css("font-size:12px;margin-top:2px;flex:none")} />{d.text}</div>
                  ))}
                </div>
              )}
              {vals.replayDone && (
                <div className="card-meta"><span style={css("color:var(--color-accent-300)")}>cost {vals.replayNewCost}</span>{vals.replayCostDelta && <><span>·</span><span>{vals.replayCostDelta}</span></>}</div>
              )}
            </div>
          </div>
        )}

        {!vals.replayHasOrig && !vals.replayError && (
          <div className="card elev-sm" style={css("gap:8px;align-items:center;justify-content:center;border:1px dashed var(--color-divider);min-height:120px;color:var(--color-neutral-600);font-size:12.5px")}>{vals.replayHint}</div>
        )}
      </div>
    </div>
  );
}
