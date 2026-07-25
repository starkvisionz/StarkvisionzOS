import { css } from "../css";
import type { Vals } from "../os/deriveVals";

export function LoopView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 44px")}>
      <div style={css("max-width:780px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}>
          <h3 style={css("margin:0")}>Multi-agent loop</h3>
          <span style={css("font-size:12px;color:var(--color-neutral-500)")}>agents review and improve each other until they converge</span>
        </div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 18px")}>An author agent drafts, reviewers score and critique, and the best notes fold into the next round. Every round is logged as an event; the loop stops when the score clears the target.</p>

        <div className="card elev-sm" style={css("gap:14px;padding:15px 16px;margin-bottom:22px")}>
          <div className="field">
            <label>Task</label>
            <input className="input" value={vals.loopTask} onChange={vals.onLoopTask} />
          </div>
          <div style={css("display:flex;align-items:center;gap:16px;flex-wrap:wrap")}>
            <div style={css("display:flex;align-items:center;gap:10px")}>
              {vals.loopParticipants.map((p, i) => (
                <div key={i} style={css("display:flex;align-items:center;gap:7px")}>
                  <div style={css(`width:26px;height:26px;border-radius:7px;background:${p.bg};display:grid;place-items:center;box-shadow:0 0 12px color-mix(in srgb,${p.dot} 34%,transparent)`)}><i className={p.icon} style={css(`font-size:14px;color:${p.dot}`)} /></div>
                  <div><div style={css("font-size:12px;line-height:1.1")}>{p.name}</div><div style={css("font-size:10px;color:var(--color-neutral-600)")}>{p.role}</div></div>
                </div>
              ))}
            </div>
            <span style={css("font-size:11.5px;color:var(--color-neutral-500);display:inline-flex;align-items:center;gap:5px")}><i className="ph ph-target" style={css("font-size:14px;color:var(--color-accent-300)")} />Target {vals.loopTarget}</span>
            <div style={css("margin-left:auto;display:flex;align-items:center;gap:8px")}>
              <span style={css(`display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:${vals.loopStatusColor}`)}><i className={vals.loopStatusIcon} style={css(`font-size:13px;${vals.loopSpin}`)} />{vals.loopStatus}</span>
              <button className="btn btn-secondary" onClick={vals.resetLoop} style={css("padding:6px 11px;font-size:12.5px")}><i className="ph ph-arrow-counter-clockwise" style={css("font-size:14px;margin-right:5px")} />Reset</button>
              <button className="btn btn-primary" onClick={vals.runLoop} style={css("padding:6px 13px;font-size:12.5px")}><i className="ph ph-play" style={css("font-size:14px;margin-right:5px")} />{vals.runLabel}</button>
            </div>
          </div>
          {vals.hasLoop && (
            <div style={css("display:flex;align-items:center;gap:7px;padding-top:2px")}>
              <span style={css("font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-600)")}>Scores</span>
              {vals.loopScores.map((sc, i) => (
                <span key={i} style={css(`display:inline-grid;place-items:center;min-width:30px;height:22px;border-radius:6px;font-size:12px;font-weight:600;background:color-mix(in srgb,${sc.color} 20%,var(--color-surface));color:${sc.color};box-shadow:inset 0 0 0 1px color-mix(in srgb,${sc.color} 45%,transparent)`)}>{sc.v}</span>
              ))}
            </div>
          )}
        </div>

        {vals.hasLoop && (
          <div style={css("display:flex;flex-direction:column;gap:2px")}>
            {vals.loopRounds.map((r, ri) => (
              <div key={ri}>
                <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:10px")}>
                  <span className="tag tag-outline" style={css("font-size:10px;padding:2px 9px")}>ROUND {r.n}</span>
                  <div style={css("flex:1;height:1px;background:var(--color-divider)")} />
                  <span style={css("font-size:12px;color:var(--color-neutral-500)")}>score</span>
                  <span style={css(`font-size:16px;font-weight:600;font-family:var(--font-heading);color:${r.scoreColor}`)}>{r.score}</span>
                </div>

                <div style={css("display:flex;gap:12px;margin-bottom:12px")}>
                  <div style={css(`width:28px;height:28px;flex:none;border-radius:8px;background:${r.authorBg};display:grid;place-items:center;box-shadow:0 0 16px ${r.authorGlow},inset 0 0 0 1px ${r.authorGlow}`)}><i className={r.authorIcon} style={css(`font-size:15px;color:${r.authorFg}`)} /></div>
                  <div style={css("flex:1;min-width:0")}>
                    <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:6px")}><span style={css("font-size:13px;font-weight:600;font-family:var(--font-heading)")}>{r.authorName}</span><span className="tag tag-neutral" style={css("font-size:9px;padding:1px 7px")}>DRAFT v{r.n}</span></div>
                    <div style={css("font-size:13.5px;line-height:1.6;color:var(--color-neutral-200);background:var(--color-surface);border:1px solid var(--color-divider);border-radius:var(--radius-md);padding:11px 13px")}>{r.draft}</div>
                  </div>
                </div>

                <div style={css("margin-left:40px;display:flex;flex-direction:column;gap:8px")}>
                  {r.reviews.map((rv, rvi) => (
                    <div key={rvi} style={css("display:flex;gap:11px;align-items:flex-start")}>
                      <div style={css(`width:24px;height:24px;flex:none;border-radius:7px;background:${rv.bg};display:grid;place-items:center;box-shadow:0 0 12px ${rv.glow}`)}><i className={rv.icon} style={css(`font-size:13px;color:${rv.fg}`)} /></div>
                      <div style={css("flex:1;min-width:0")}>
                        <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:2px")}>
                          <span style={css("font-size:12px;font-weight:600")}>{rv.name}</span>
                          <span style={css("font-size:11px;color:var(--color-neutral-600)")}>reviews</span>
                          <span style={css(`margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:${rv.scoreColor}`)}><i className={rv.verdict} style={css(`font-size:14px;color:${rv.verdictColor}`)} />{rv.score}</span>
                        </div>
                        <div style={css("font-size:12.5px;line-height:1.5;color:var(--color-neutral-400)")}>{rv.note}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {r.showConnector && (
                  <div style={css("display:flex;align-items:center;gap:8px;color:var(--color-accent-300);font-size:11.5px;margin:14px 0 14px 8px")}><i className="ph ph-arrow-elbow-down-right" style={css("font-size:16px")} />notes folded into the next draft</div>
                )}
              </div>
            ))}

            {vals.loopDone && (
              <div style={css("margin-top:20px;border:1px solid var(--color-accent-400);border-radius:var(--radius-lg);background:linear-gradient(180deg,color-mix(in srgb,var(--color-accent) 16%,var(--color-surface)),var(--color-surface));padding:16px 18px;box-shadow:0 0 30px color-mix(in srgb,var(--color-accent) 22%,transparent)")}>
                <div style={css("display:flex;align-items:center;gap:11px")}>
                  <i className="ph-fill ph-check-circle" style={css("font-size:24px;color:var(--color-accent)")} />
                  <div style={css("flex:1")}>
                    <div style={css("font-size:15px;font-weight:600;font-family:var(--font-heading)")}>Converged at {vals.bestScore} · {vals.roundCount} rounds</div>
                    <div style={css("font-size:12.5px;color:var(--color-neutral-400)")}>The final draft cleared the target. Accept it as the answer, or push one more round.</div>
                  </div>
                </div>
                <div style={css("display:flex;gap:9px;margin-top:13px")}>
                  <button className="btn btn-primary"><i className="ph ph-check" style={css("font-size:14px;margin-right:6px")} />Accept best output</button>
                  <button className="btn btn-secondary" onClick={vals.improveMore}><i className="ph ph-arrows-clockwise" style={css("font-size:14px;margin-right:6px")} />Improve once more</button>
                </div>
              </div>
            )}
          </div>
        )}

        {vals.loopEmpty && (
          <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:56px 20px;text-align:center;border:1px dashed var(--color-divider);border-radius:var(--radius-lg)")}>
            <i className="ph ph-arrows-clockwise" style={css("font-size:34px;color:var(--color-accent-300)")} />
            <div style={css("font-size:14px;color:var(--color-neutral-300)")}>No loop running yet</div>
            <div style={css("font-size:12.5px;color:var(--color-neutral-600);max-width:340px")}>Set a task and hit Run loop. Forge drafts, Claude and Hermes review and score, and the draft improves each round.</div>
          </div>
        )}
      </div>
    </div>
  );
}
