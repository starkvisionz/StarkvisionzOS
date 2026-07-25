import { css } from "../css";
import type { Vals } from "../os/deriveVals";
import { SimTag } from "../components/SimTag";

export function ReplayView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:900px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:6px")}><h3 style={css("margin:0")}>Model replay</h3><span style={css("font-size:12px;color:var(--color-neutral-500)")}>re-run an old decision through a newer model</span><SimTag /></div>
        <p style={css("font-size:13px;color:var(--color-neutral-500);max-width:600px;margin:0 0 16px")}>Replay the original event sequence — same requirements, same constraints — through a better model, and diff what changes. The project gets smarter as the models do.</p>
        <div className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:12px;padding:12px 15px;margin-bottom:16px")}>
          <i className="ph ph-git-fork" style={css("font-size:18px;color:var(--color-accent-300)")} />
          <div style={css("flex:1")}><div style={css("font-size:13.5px;font-weight:600")}>Decision dec_204 · event store choice</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>decided Jan 2026</div></div>
          <button className="btn btn-primary" onClick={vals.runReplay} style={css("font-size:12.5px;gap:6px")}><i className={vals.replayBtnIcon} style={css(`font-size:14px;${vals.replaySpin}`)} />{vals.replayBtnLabel}</button>
        </div>
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
          <div className="card elev-sm" style={css("gap:8px")}>
            <div className="card-kicker" style={css("color:var(--color-neutral-500)")}>Original · gpt-4o</div>
            <div style={css("font-size:13.5px;line-height:1.55;color:var(--color-neutral-300)")}>Use PostgreSQL append-only tables for the event store. Skip Kafka on day one.</div>
            <div className="card-meta"><span>cost $0.34</span><span>·</span><span>Jan 2026</span></div>
          </div>
          {vals.replayDone && (
            <div className="card elev-sm" style={css("gap:8px;border:1px solid var(--color-accent-500);box-shadow:0 0 24px color-mix(in srgb,var(--color-accent) 20%,transparent)")}>
              <div className="card-kicker">Replayed · Claude 4.5 · Jul 2026</div>
              <div style={css("font-size:13.5px;line-height:1.55;color:var(--color-neutral-200)")}>Confirms PostgreSQL. Adds a monthly partition on events and an HNSW pgvector index for the dedupe window.</div>
              <div style={css("display:flex;flex-direction:column;gap:4px;margin-top:2px")}>
                {vals.replayDiffs.map((d, i) => (
                  <div key={i} style={css(`display:flex;align-items:center;gap:7px;font-size:11.5px;font-family:ui-monospace,Menlo,monospace;color:${d.color}`)}><i className={d.icon} style={css("font-size:12px")} />{d.text}</div>
                ))}
              </div>
              <div className="card-meta"><span style={css("color:var(--color-accent-300)")}>cost $0.11</span><span>·</span><span>3× cheaper, sharper</span></div>
            </div>
          )}
          {vals.replayPending && (
            <div className="card elev-sm" style={css("gap:8px;align-items:center;justify-content:center;border:1px dashed var(--color-divider);min-height:120px;color:var(--color-neutral-600);font-size:12.5px")}>{vals.replayHint}</div>
          )}
        </div>
      </div>
    </div>
  );
}
