import { css } from "../css";
import type { BlockVM, Vals } from "../os/deriveVals";

export function ChatView({ vals }: { vals: Vals }) {
  const model = vals.model;
  return (
    <div style={css("display:flex;flex-direction:column;height:100%;position:relative")}>
      {/* top bar */}
      <header style={css("flex:none;display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--color-divider)")}>
        <div style={css("min-width:0")}>
          <div style={css("font-family:var(--font-heading);font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{vals.activeTitle}</div>
          <div style={css("display:flex;align-items:center;gap:7px;margin-top:2px")}>
            {vals.contextChips.map((c, i) => (
              <span key={i} style={css("display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--color-neutral-500)")}>
                <i className={c.icon} style={css("font-size:12px")} />{c.label}
              </span>
            ))}
          </div>
        </div>

        <div style={css("margin-left:auto;position:relative")}>
          <button className="btn btn-secondary" style={css("gap:8px")} onClick={vals.togglePicker}>
            <span style={css(`width:8px;height:8px;border-radius:50%;background:${model.dot}`)} />
            <span style={css("font-size:13px")}>{model.name}</span>
            <span style={css("font-size:11px;color:var(--color-neutral-500)")}>{model.sub}</span>
            <i className="ph ph-caret-down" style={css("font-size:12px")} />
          </button>
          {vals.pickerOpen && (
            <div className="elev-md" style={css("position:absolute;top:44px;right:0;width:288px;background:var(--color-surface);border-radius:var(--radius-md);padding:6px;z-index:30")}>
              <div style={css("padding:6px 8px 4px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-neutral-600)")}>Route to</div>
              {vals.models.map((m, i) => (
                <div key={i} className="oc-model-opt" onClick={m.onSelect} style={css(`display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:var(--radius-sm);cursor:pointer;background:${m.bg}`)}>
                  <span style={css(`width:9px;height:9px;border-radius:50%;flex:none;background:${m.dot}`)} />
                  <div style={css("flex:1;min-width:0")}>
                    <div style={css("font-size:13px")}>{m.name}</div>
                    <div style={css("font-size:10.5px;color:var(--color-neutral-600)")}>{m.sub}</div>
                  </div>
                  {m.active && <i className="ph ph-check" style={css("font-size:14px;color:var(--color-accent)")} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={css("display:flex;align-items:center;gap:5px;padding-left:12px;border-left:1px solid var(--color-divider);font-size:11px;color:var(--color-neutral-500)")}>
          <i className="ph ph-coins" style={css("font-size:14px")} />
          <span>{vals.sessionTokens} tok</span>
          <span style={css("color:var(--color-accent-300)")}>{vals.sessionCost}</span>
        </div>
      </header>

      {/* thread */}
      <div className="oc-scroll" ref={vals.setThreadRef} style={css("flex:1;overflow-y:auto;padding:26px 0 20px")}>
        <div style={css("max-width:760px;margin:0 auto;padding:0 28px;display:flex;flex-direction:column;gap:22px")}>
          {vals.chatEmpty && (
            <div style={css("display:flex;flex-direction:column;align-items:center;gap:10px;padding:60px 20px;text-align:center;color:var(--color-neutral-500)")}>
              <div style={css("width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--color-accent-500),var(--color-accent-700));display:grid;place-items:center;box-shadow:0 0 22px color-mix(in srgb,var(--color-accent) 40%,transparent)")}>
                <i className="ph-fill ph-hand-tap" style={css("font-size:22px;color:#12141f")} />
              </div>
              <div style={css("font-size:15px;color:var(--color-neutral-200);font-family:var(--font-heading);font-weight:600")}>Message {model.name}</div>
              <div style={css("font-size:12.5px;max-width:360px;line-height:1.5")}>Ask anything. Replies stream from the real Claude API and every turn is logged to the event store.{vals.apiKeyMissing ? " Set an API key to enable live replies." : ""}</div>
            </div>
          )}
          {vals.messages.map((msg, mi) =>
            msg.isUser ? (
              <div key={mi} style={css("display:flex;flex-direction:column;align-items:flex-end;gap:6px")}>
                {msg.hasFiles && (
                  <div style={css("display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end")}>
                    {msg.files.map((f, fi) => (
                      <span key={fi} style={css("display:inline-flex;align-items:center;gap:6px;padding:5px 9px;background:var(--color-surface);border:1px solid var(--color-divider);border-radius:var(--radius-md);font-size:11.5px")}>
                        <i className={f.icon} style={css("font-size:13px;color:var(--color-accent-300)")} />{f.name}
                      </span>
                    ))}
                  </div>
                )}
                <div style={css("max-width:82%;background:linear-gradient(135deg,var(--color-accent-400),var(--color-accent-600));border:1px solid var(--color-accent-300);color:#0a0c14;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:14px;font-weight:500;line-height:1.55;white-space:pre-wrap;box-shadow:0 4px 22px color-mix(in srgb,var(--color-accent) 32%,transparent)")}>{msg.text}</div>
              </div>
            ) : (
              <div key={mi} style={css("display:flex;gap:13px")}>
                <div style={css(`width:28px;height:28px;flex:none;border-radius:8px;background:${msg.agentBg};display:grid;place-items:center;margin-top:2px;box-shadow:0 0 16px ${msg.agentGlow},inset 0 0 0 1px ${msg.agentGlow}`)}>
                  <i className={msg.agentIcon} style={css(`font-size:15px;color:${msg.agentFg}`)} />
                </div>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:7px")}>
                    <span style={css("font-size:13px;font-weight:600;font-family:var(--font-heading)")}>{msg.agentName}</span>
                    <span style={css("font-size:10.5px;color:var(--color-neutral-600)")}>{msg.agentSub}</span>
                    {msg.cost && <span className="tag tag-neutral" style={css("font-size:9.5px;padding:1px 7px;margin-left:auto")}>{msg.cost}</span>}
                  </div>

                  <div style={css("display:flex;flex-direction:column;gap:12px")}>
                    {msg.blocks.map((b, bi) => (
                      <Block key={bi} b={b} />
                    ))}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* composer */}
      <div style={css("flex:none;padding:0 0 18px")}>
        <div style={css("max-width:760px;margin:0 auto;padding:0 28px")}>
          {vals.hasAttachments && (
            <div style={css("display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px")}>
              {vals.attachments.map((at, i) => (
                <span key={i} style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 10px;background:var(--color-surface);border:1px solid var(--color-divider);border-radius:var(--radius-md);font-size:11.5px")}>
                  <i className={at.icon} style={css("font-size:14px;color:var(--color-accent-300)")} />{at.name}
                  <i className="ph ph-x" onClick={at.onRemove} style={css("font-size:12px;cursor:pointer;color:var(--color-neutral-500)")} />
                </span>
              ))}
            </div>
          )}
          <div className="oc-composer" style={css("border:1px solid var(--color-divider);border-radius:var(--radius-lg);background:var(--color-surface);padding:8px 8px 8px 14px")}>
            <textarea
              ref={vals.setInputRef}
              onKeyDown={vals.onKeyDown}
              rows={1}
              placeholder={`Message ${model.name}…  (routes through the Hub — every turn is logged as an event)`}
              style={css("width:100%;background:transparent;border:0;outline:none;resize:none;color:var(--color-text);font-family:var(--font-body);font-size:14px;line-height:1.5;max-height:180px;padding:6px 4px")}
            />
            <div style={css("display:flex;align-items:center;gap:6px;margin-top:4px")}>
              <button className="btn btn-icon" onClick={vals.attach} title="Attach file" style={css("color:var(--color-neutral-400)")}><i className="ph ph-paperclip" style={css("font-size:17px")} /></button>
              <button className="btn btn-icon" title="Pull project context" style={css("color:var(--color-neutral-400)")}><i className="ph ph-brain" style={css("font-size:17px")} /></button>
              <button className="btn btn-secondary" onClick={vals.togglePicker} style={css("gap:6px;padding:5px 10px")}>
                <span style={css(`width:7px;height:7px;border-radius:50%;background:${model.dot}`)} /><span style={css("font-size:12px")}>{model.name}</span>
              </button>
              <span style={css(`margin-left:auto;font-size:10.5px;color:${vals.apiKeyMissing ? "#d6c07a" : "var(--color-neutral-600)"}`)}>{vals.apiKeyMissing ? "No API key · replies explain setup" : "Immutable event log · on"}</span>
              <button className="btn btn-primary btn-icon" onClick={vals.send} title="Send" style={css("background:var(--color-accent);border-color:var(--color-accent)")}><i className="ph-fill ph-arrow-up" style={css("font-size:16px;color:#12141f")} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ b }: { b: BlockVM }) {
  if (b.isText) {
    return (
      <div style={css("font-size:14px;line-height:1.62;white-space:pre-wrap;color:var(--color-neutral-200)")}>
        {b.text}
        {b.streaming && <span style={css("display:inline-block;width:8px;height:15px;background:var(--color-accent);margin-left:2px;vertical-align:-2px;animation:ocblink 1s steps(1) infinite")} />}
      </div>
    );
  }
  if (b.isTool) {
    return (
      <div style={css("border:1px solid var(--color-divider);border-radius:var(--radius-md);overflow:hidden;background:#12141f")}>
        <div style={css("display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--color-surface)")}>
          <i className="ph ph-wrench" style={css("font-size:14px;color:var(--color-accent-300)")} />
          <span style={css("font-size:12.5px;font-weight:600;font-family:var(--font-heading)")}>{b.name}</span>
          <span style={css("font-size:11px;color:var(--color-neutral-500)")}>{b.detail}</span>
          <span className="tag tag-accent" style={css("margin-left:auto;font-size:9.5px;padding:1px 7px")}>{b.status}</span>
        </div>
        <div style={css("padding:4px 12px 10px")}>
          {(b.lines || []).map((ln, i) => (
            <div key={i} style={css("display:flex;align-items:center;gap:8px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;padding:3px 0;color:var(--color-neutral-400)")}>
              <i className={ln.icon} style={css(`font-size:12px;color:${ln.color}`)} />{ln.text}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (b.isCode) {
    return (
      <div style={css("border:1px solid var(--color-divider);border-radius:var(--radius-md);overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--color-surface);font-family:ui-monospace,Menlo,monospace;font-size:11px;color:var(--color-neutral-500)")}>
          <i className="ph ph-file-ts" style={css("font-size:13px")} />{b.file}
          <i className="ph ph-copy" style={css("font-size:13px;margin-left:auto;cursor:pointer")} />
        </div>
        <pre style={css("margin:0;padding:12px 14px;background:#0e1018;overflow-x:auto;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.6;color:var(--color-neutral-300)")}>{b.code}</pre>
      </div>
    );
  }
  if (b.isApproval) {
    return (
      <div style={css(`border:1px solid ${b.borderColor};border-radius:var(--radius-md);background:var(--color-surface);padding:13px 15px`)}>
        <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:6px")}>
          <i className={b.icon} style={css(`font-size:17px;color:${b.iconColor}`)} />
          <span style={css("font-size:13.5px;font-weight:600;font-family:var(--font-heading)")}>{b.title}</span>
          <span className={`tag ${b.tagClass}`} style={css("margin-left:auto;font-size:9.5px;padding:2px 8px")}>{b.statusLabel}</span>
        </div>
        <div style={css("font-size:12.5px;color:var(--color-neutral-400);line-height:1.5;margin-bottom:11px")}>{b.detail}</div>
        {b.pending && (
          <div style={css("display:flex;gap:8px")}>
            <button className="btn btn-primary" style={css("gap:6px")} onClick={b.onApprove}><i className="ph ph-check" style={css("font-size:14px")} />Approve</button>
            <button className="btn btn-secondary" style={css("gap:6px")} onClick={b.onReject}><i className="ph ph-x" style={css("font-size:14px")} />Reject</button>
            <span style={css("margin-left:auto;align-self:center;font-size:10.5px;color:var(--color-neutral-600)")}>{b.gate}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}
