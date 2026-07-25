import { useState } from "react";
import { css } from "../css";
import { setToken } from "../api";

/**
 * Shown when the backend requires a bearer token and the stored one is missing
 * or invalid. Stores the token and reloads so the app boots authenticated.
 */
export function AuthGate() {
  const [value, setValue] = useState("");
  const submit = () => {
    const t = value.trim();
    if (!t) return;
    setToken(t);
    window.location.reload();
  };
  return (
    <div style={css("position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:radial-gradient(900px 600px at 50% -10%, color-mix(in srgb,var(--color-accent) 12%,transparent), transparent 60%), var(--color-bg);color:var(--color-text);font-family:var(--font-body)")}>
      <div className="elev-lg" style={css("width:min(400px,92vw);background:var(--color-surface);border:1px solid var(--color-accent-600);border-radius:var(--radius-lg);padding:22px")}>
        <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:14px")}>
          <div style={css("width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--color-accent-500),var(--color-accent-700));display:grid;place-items:center")}>
            <i className="ph-fill ph-lock-key" style={css("font-size:16px;color:#12141f")} />
          </div>
          <div>
            <div style={css("font-family:var(--font-heading);font-weight:600;font-size:15px")}>Starkvisionz OS</div>
            <div style={css("font-size:11.5px;color:var(--color-neutral-500)")}>This workspace requires an access token</div>
          </div>
        </div>
        <div className="field" style={css("margin-bottom:12px")}>
          <label>Access token</label>
          <input
            className="input"
            type="password"
            value={value}
            autoFocus
            placeholder="Paste the server's SVOS_AUTH_TOKEN"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>
        <button className="btn btn-primary btn-block" onClick={submit}>
          <i className="ph ph-arrow-right" style={css("font-size:15px;margin-right:6px")} />Unlock
        </button>
        <div style={css("font-size:11px;color:var(--color-neutral-600);margin-top:11px;line-height:1.5")}>
          The token is the value of <code style={css("font-family:ui-monospace,Menlo,monospace")}>SVOS_AUTH_TOKEN</code> set on the server. It is stored only in this browser.
        </div>
      </div>
    </div>
  );
}
