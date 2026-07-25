import { css } from "../css";
import type { Vals } from "../os/deriveVals";

function Toggle({ trackBg, knobX, knobBg, onToggle }: { trackBg: string; knobX: string; knobBg: string; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={css(`width:38px;height:22px;border-radius:11px;background:${trackBg};position:relative;cursor:pointer;flex:none;transition:background .2s`)}>
      <span style={css(`position:absolute;top:3px;left:${knobX};width:16px;height:16px;border-radius:50%;background:${knobBg};transition:left .18s`)} />
    </div>
  );
}

export function SettingsView({ vals }: { vals: Vals }) {
  return (
    <div className="oc-scroll" style={css("flex:1;overflow-y:auto;padding:26px 34px 40px")}>
      <div style={css("max-width:900px;margin:0 auto")}>
        <div style={css("display:flex;align-items:center;gap:10px")}><h3 style={css("margin:0 0 4px")}>Settings</h3></div>
        <span style={css("font-size:12px;color:var(--color-neutral-500)")}>Persisted to the backend as an event and reloaded on boot. The system prompt, About text, and model drive real Claude chat; the remaining toggles are saved but presentation-only for now.</span>
        <div style={css("display:flex;gap:28px;margin-top:20px;align-items:flex-start")}>
          <div style={css("width:196px;flex:none;display:flex;flex-direction:column;gap:2px")}>
            {vals.settingsTabs.map((st, i) => (
              <div key={i} className="oc-nav-item" onClick={st.onClick} style={css(`display:flex;align-items:center;gap:10px;padding:8px 11px;border-radius:var(--radius-md);cursor:pointer;font-size:13px;color:${st.color};background:${st.bg}`)}>
                <i className={st.icon} style={css("font-size:16px")} />{st.label}
              </div>
            ))}
          </div>

          <div style={css("flex:1;min-width:0")}>
            {vals.isPromptTab && (
              <div style={css("display:flex;flex-direction:column;gap:18px")}>
                <div>
                  <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:4px")}>System prompt</div>
                  <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 10px")}>Instructions prepended to every agent turn. Stored as an event, so prompt changes are versioned too.</p>
                  <textarea className="input" value={vals.sysPrompt} onChange={vals.onPrompt} style={css("min-height:150px;line-height:1.55;font-family:ui-monospace,Menlo,monospace;font-size:12.5px")} />
                </div>
                <div>
                  <div style={css("font-size:12px;color:var(--color-neutral-300);margin-bottom:6px")}>What should agents know about you?</div>
                  <textarea className="input" value={vals.aboutText} onChange={vals.onAbout} style={css("min-height:88px;font-size:13px")} />
                </div>
                <div style={css("display:flex;align-items:center;gap:12px")}>
                  <button className="btn btn-primary" onClick={vals.savePrompt}><i className="ph ph-floppy-disk" style={css("font-size:15px;margin-right:6px")} />Save changes</button>
                  {vals.promptSaved && <span style={css("display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--color-accent-300)")}><i className="ph ph-check-circle" style={css("font-size:15px")} />Saved as event</span>}
                </div>
              </div>
            )}

            {vals.isToolsTab && (
              <div>
                <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:4px")}>Tools</div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 14px")}>Capabilities agents may call. Every invocation is logged as an event; production actions still require your approval.</p>
                <div style={css("display:flex;flex-direction:column;gap:2px")}>
                  {vals.toolsList.map((t, i) => (
                    <div key={i} style={css("display:flex;align-items:center;gap:13px;padding:12px 4px;border-bottom:1px solid var(--color-divider)")}>
                      <i className={t.icon} style={css(`font-size:19px;color:${t.iconColor};width:22px;text-align:center`)} />
                      <div style={css("flex:1;min-width:0")}><div style={css("font-size:13.5px")}>{t.name}</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{t.desc}</div></div>
                      <Toggle trackBg={t.trackBg} knobX={t.knobX} knobBg={t.knobBg} onToggle={t.onToggle} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vals.isMcpTab && (
              <div>
                <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:4px")}>
                  <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300)")}>Connectors · MCP</div>
                  <button className="btn btn-secondary" style={css("margin-left:auto;gap:6px;padding:5px 10px;font-size:12px")}><i className="ph ph-plus" style={css("font-size:14px")} />Add server</button>
                </div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 14px")}>Model Context Protocol servers exposing tools and resources to every agent in the Hub.</p>
                <div style={css("display:flex;flex-direction:column;gap:10px")}>
                  {vals.mcpList.map((m, i) => (
                    <div key={i} className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:13px;padding:12px 14px")}>
                      <span style={css(`width:9px;height:9px;border-radius:50%;flex:none;background:${m.dotColor}`)} />
                      <i className={m.icon} style={css("font-size:20px;color:var(--color-neutral-300);width:24px;text-align:center")} />
                      <div style={css("flex:1;min-width:0")}><div style={css("font-size:13.5px;font-weight:600;font-family:var(--font-heading)")}>{m.name}</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{m.transport} · {m.tools}</div></div>
                      <span className={`tag ${m.tagClass}`} style={css("font-size:9.5px")}>{m.statusLabel}</span>
                      <button className={`btn ${m.btnClass}`} onClick={m.onToggle} style={css("padding:5px 12px;font-size:12px")}>{m.btnLabel}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vals.isPluginsTab && (
              <div>
                <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:4px")}>
                  <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300)")}>Plugins</div>
                  <span style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{vals.pluginsOnCount} of {vals.pluginsTotal} enabled</span>
                  <button className="btn btn-secondary" style={css("margin-left:auto;gap:6px;padding:5px 10px;font-size:12px")}><i className="ph ph-puzzle-piece" style={css("font-size:14px")} />Browse registry</button>
                </div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 14px")}>Plugins extend the Hub itself, not just the models — they add views, subscribe to events, and can veto an agent action before it runs. Each declares its permissions up front.</p>

                <div style={css("display:flex;gap:3px;padding:3px;border-radius:var(--radius-md);background:var(--color-neutral-900);margin-bottom:14px")}>
                  {vals.pluginCats.map((c, i) => (
                    <div key={i} onClick={c.onClick} className="oc-model-opt" style={css(`flex:1;text-align:center;padding:6px;border-radius:calc(var(--radius-md) - 2px);cursor:pointer;font-size:12px;color:${c.color};background:${c.bg}`)}>{c.label}</div>
                  ))}
                </div>

                <div style={css("display:flex;flex-direction:column;gap:10px")}>
                  {vals.pluginList.map((p, i) => (
                    <div key={i} className="card elev-sm" style={css(`gap:11px;padding:14px 15px;border:1px solid ${p.border}`)}>
                      <div style={css("display:flex;align-items:flex-start;gap:12px")}>
                        <div style={css(`width:32px;height:32px;flex:none;border-radius:9px;background:${p.bg};display:grid;place-items:center`)}><i className={p.icon} style={css(`font-size:17px;color:${p.color}`)} /></div>
                        <div style={css("flex:1;min-width:0")}>
                          <div style={css("display:flex;align-items:center;gap:8px")}><span style={css("font-size:13.5px;font-weight:600;font-family:var(--font-heading)")}>{p.name}</span><span className={p.tagClass} style={css("font-size:9px;padding:0 6px")}>{p.kind}</span>{p.official && <i className="ph-fill ph-seal-check" style={css("font-size:13px;color:var(--color-accent)")} />}</div>
                          <div style={css("font-size:12.5px;color:var(--color-neutral-500);line-height:1.5;margin-top:3px")}>{p.desc}</div>
                        </div>
                        <Toggle trackBg={p.trackBg} knobX={p.knobX} knobBg={p.knobBg} onToggle={p.onToggle} />
                      </div>
                      <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-left:44px")}>
                        {p.perms.map((pm, pi) => (
                          <span key={pi} className="tag tag-outline" style={css("font-size:9.5px")}><i className={pm.icon} style={css("font-size:11px;margin-right:4px")} />{pm.label}</span>
                        ))}
                        <span style={css("margin-left:auto;font-size:10.5px;color:var(--color-neutral-600);font-family:ui-monospace,Menlo,monospace")}>{p.meta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vals.isMemoryTab && (
              <div>
                <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:4px")}>Memory &amp; retention</div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 16px")}>What the Hub keeps, how long it keeps it, and when it stops trusting it. These values drive the memory graph and the truth-decay ledger.</p>
                <div style={css("display:flex;flex-direction:column;gap:16px")}>
                  <div>
                    <div style={css("font-size:12px;color:var(--color-neutral-300);margin-bottom:6px")}>Default claim half-life</div>
                    <div style={css("display:flex;align-items:center;gap:11px")}>
                      <input type="range" min={7} max={180} step={7} value={vals.halfVal} onChange={vals.onHalf} style={css("flex:1;accent-color:var(--color-accent)")} />
                      <span style={css("font-size:14px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-accent-200);width:56px;text-align:right")}>{vals.halfVal}d</span>
                    </div>
                    <div style={css("font-size:11px;color:var(--color-neutral-600);margin-top:5px")}>A claim decays to 50% confidence after this long without re-verification.</div>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:2px")}>
                    {vals.memList.map((m, i) => (
                      <div key={i} style={css("display:flex;align-items:center;gap:13px;padding:12px 4px;border-bottom:1px solid var(--color-divider)")}>
                        <i className={m.icon} style={css(`font-size:19px;color:${m.iconColor};width:22px;text-align:center`)} />
                        <div style={css("flex:1;min-width:0")}><div style={css("font-size:13.5px")}>{m.name}</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{m.desc}</div></div>
                        <Toggle trackBg={m.trackBg} knobX={m.knobX} knobBg={m.knobBg} onToggle={m.onToggle} />
                      </div>
                    ))}
                  </div>
                  <div style={css("display:flex;gap:10px;padding:13px 15px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-divider);align-items:center")}>
                    <i className="ph ph-share-network" style={css("font-size:19px;color:var(--color-accent-300)")} />
                    <div style={css("flex:1;font-size:12.5px;color:var(--color-neutral-400)")}>{vals.memGraphStat}</div>
                    <button className="btn btn-secondary" onClick={vals.goGraph} style={css("font-size:12px;padding:5px 11px")}>Open graph</button>
                  </div>
                </div>
              </div>
            )}

            {vals.isAppearanceTab && (
              <div>
                <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:4px")}>Appearance</div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 16px")}>Chrome and density. The Hub is dense by default — loosen it if you present from this screen.</p>
                <div style={css("display:flex;flex-direction:column;gap:18px")}>
                  <div>
                    <div style={css("font-size:12px;color:var(--color-neutral-300);margin-bottom:6px")}>Density</div>
                    <div className="seg">
                      {vals.densityOpts.map((d, i) => (
                        <div key={i} className="seg-opt" onClick={d.onClick} style={css(`cursor:pointer;font-size:12px;color:${d.color};background:${d.bg}`)}>{d.label}</div>
                      ))}
                    </div>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:2px")}>
                    {vals.appearList.map((ap, i) => (
                      <div key={i} style={css("display:flex;align-items:center;gap:13px;padding:12px 4px;border-bottom:1px solid var(--color-divider)")}>
                        <i className={ap.icon} style={css(`font-size:19px;color:${ap.iconColor};width:22px;text-align:center`)} />
                        <div style={css("flex:1;min-width:0")}><div style={css("font-size:13.5px")}>{ap.name}</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{ap.desc}</div></div>
                        <Toggle trackBg={ap.trackBg} knobX={ap.knobX} knobBg={ap.knobBg} onToggle={ap.onToggle} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {vals.isRiskTab && (
              <div>
                <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:4px")}>Risk policy</div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 16px")}>Set the stakes once and the Hub derives the rest. Raising this dial is itself an event, so you can always see which policy a past task ran under.</p>
                <div style={css(`padding:18px 20px;border-radius:var(--radius-lg);background:linear-gradient(180deg,color-mix(in srgb,${vals.stakeColor} 12%,var(--color-surface)),var(--color-surface));border:1px solid ${vals.stakeBorder};box-shadow:0 0 34px ${vals.stakeGlow};margin-bottom:26px`)}>
                  <div style={css("display:flex;align-items:flex-start;gap:14px;margin-bottom:15px")}>
                    <i className="ph-fill ph-gauge" style={css(`font-size:22px;color:${vals.stakeColor};margin-top:1px`)} />
                    <div style={css("flex:1")}>
                      <div style={css("display:flex;align-items:center;gap:10px")}><span style={css("font-size:14.5px;font-weight:600;font-family:var(--font-heading)")}>Cost of being wrong</span><span className={vals.stakeTagClass} style={css("font-size:9.5px")}>{vals.stakeName}</span></div>
                      <div style={css("font-size:12px;color:var(--color-neutral-500);margin-top:3px")}>One dial for the stakes. Everything downstream — model tier, reviewers, approval gates, retry budget — follows from it.</div>
                    </div>
                    <div style={css("text-align:right;flex:none")}><div style={css(`font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:${vals.stakeColor}`)}>{vals.stakeCost}</div><div style={css("font-size:10px;color:var(--color-neutral-600);text-transform:uppercase;letter-spacing:.07em")}>est / task</div></div>
                  </div>

                  <div style={css("display:flex;gap:3px;padding:3px;border-radius:var(--radius-md);background:var(--color-neutral-900);margin-bottom:16px")}>
                    {vals.stakeOpts.map((o, i) => (
                      <div key={i} onClick={o.onClick} className="oc-model-opt" style={css(`flex:1;text-align:center;padding:8px 6px;border-radius:calc(var(--radius-md) - 2px);cursor:pointer;background:${o.bg};box-shadow:${o.shadow}`)}>
                        <div style={css(`font-size:12.5px;font-weight:600;color:${o.color}`)}>{o.label}</div>
                        <div style={css("font-size:10.5px;color:var(--color-neutral-600);margin-top:2px")}>{o.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div style={css("display:grid;grid-template-columns:repeat(4,1fr);gap:14px")}>
                    {vals.stakePolicy.map((p, i) => (
                      <div key={i}>
                        <div style={css("font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--color-neutral-700);margin-bottom:4px")}>{p.k}</div>
                        <div style={css("font-size:13px;font-weight:600;color:var(--color-neutral-200);line-height:1.4")}>{p.v}</div>
                        <div style={css("font-size:11px;color:var(--color-neutral-600);margin-top:2px")}>{p.note}</div>
                      </div>
                    ))}
                  </div>

                  <div style={css("display:flex;align-items:center;gap:10px;margin-top:15px;padding-top:14px;border-top:1px solid var(--color-divider)")}>
                    <i className={vals.stakeEffectIcon} style={css(`font-size:15px;color:${vals.stakeColor}`)} />
                    <div style={css("flex:1;font-size:12.5px;color:var(--color-neutral-400);line-height:1.5")}>{vals.stakeEffect}</div>
                    <button className="btn btn-ghost" onClick={vals.goSettings} style={css("font-size:11.5px;padding:3px 9px;gap:5px;flex:none")}><i className="ph ph-sliders-horizontal" style={css("font-size:12px")} />Override</button>
                  </div>
                </div>

                <div style={css("display:flex;flex-direction:column;gap:2px;margin-top:22px")}>
                  <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:8px")}>Guardrails</div>
                  {vals.guardList.map((g, i) => (
                    <div key={i} style={css("display:flex;align-items:center;gap:13px;padding:12px 4px;border-bottom:1px solid var(--color-divider)")}>
                      <i className={g.icon} style={css(`font-size:19px;color:${g.iconColor};width:22px;text-align:center`)} />
                      <div style={css("flex:1;min-width:0")}><div style={css("font-size:13.5px")}>{g.name}</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{g.desc}</div></div>
                      <Toggle trackBg={g.trackBg} knobX={g.knobX} knobBg={g.knobBg} onToggle={g.onToggle} />
                    </div>
                  ))}
                </div>
                <div style={css("display:flex;gap:20px;margin-top:20px")}>
                  <div style={css("flex:1")}>
                    <div style={css("font-size:12px;color:var(--color-neutral-300);margin-bottom:6px")}>Monthly budget ceiling</div>
                    <div style={css("display:flex;align-items:center;gap:11px")}>
                      <input type="range" min={10} max={300} step={10} value={vals.capVal} onChange={vals.onCap} style={css("flex:1;accent-color:var(--color-accent)")} />
                      <span style={css("font-size:14px;font-weight:600;font-family:ui-monospace,Menlo,monospace;color:var(--color-accent-200);width:56px;text-align:right")}>${vals.capVal}</span>
                    </div>
                    <div style={css("font-size:11px;color:var(--color-neutral-600);margin-top:5px")}>{vals.capNote}</div>
                  </div>
                  <div style={css("flex:1")}>
                    <div style={css("font-size:12px;color:var(--color-neutral-300);margin-bottom:6px")}>When the ceiling is hit</div>
                    <div className="seg">
                      {vals.capActions.map((c, i) => (
                        <div key={i} className="seg-opt" onClick={c.onClick} style={css(`cursor:pointer;font-size:12px;color:${c.color};background:${c.bg}`)}>{c.label}</div>
                      ))}
                    </div>
                    <div style={css("font-size:11px;color:var(--color-neutral-600);margin-top:5px")}>{vals.capActionNote}</div>
                  </div>
                </div>
              </div>
            )}

            {vals.isProvidersTab && (
              <div>
                <div style={css("font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-300);margin-bottom:4px")}>Providers</div>
                <p style={css("font-size:12.5px;color:var(--color-neutral-500);margin:0 0 14px")}>The models and interfaces the Hub routes to. Each turn is normalized to one internal format, so history stays portable across providers.</p>
                <div style={css("display:flex;flex-direction:column;gap:10px")}>
                  {vals.providersList.map((p, i) => (
                    <div key={i} className="card elev-sm" style={css("flex-direction:row;align-items:center;gap:13px;padding:12px 14px")}>
                      <span style={css(`width:10px;height:10px;border-radius:50%;flex:none;background:${p.dot}`)} />
                      <div style={css("flex:1;min-width:0")}><div style={css("font-size:13.5px;font-weight:600;font-family:var(--font-heading)")}>{p.name}</div><div style={css("font-size:11.5px;color:var(--color-neutral-600)")}>{p.sub}</div></div>
                      <span className={`tag ${p.tagClass}`} style={css("font-size:9.5px")}>{p.status}</span>
                      <button className="btn btn-secondary" style={css("padding:5px 12px;font-size:12px")}>Manage</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
