// Thin client for the Starkvisionz OS backend.

export interface ApiModel {
  id: string;
  name: string;
  sub: string;
  dot: string;
}

export interface ApiSession {
  id: string;
  title: string;
  model: string;
  grp: string;
  created_at: string;
  updated_at: string;
}

export interface ApiMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  created_at: string;
}

export interface ApiEvent {
  id: string;
  type: string;
  actor: string;
  summary: string;
  evidence: string;
  icon: string;
  dot: string;
  cost: number;
  approval: string;
  created_at: string;
}

export interface DashProjection {
  spend: number;
  messages: number;
  tokens: number;
  sessions: number;
  spendDays: { day: string; date: string; spend: number }[];
  apiKey: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = "svos_token";
export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}
function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { authorization: "Bearer " + t } : {};
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...authHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => jsonFetch<{ ok: boolean; apiKey: boolean; model: string; authRequired: boolean }>("/api/health"),
  models: () => jsonFetch<{ models: ApiModel[]; default: string; apiKey: boolean }>("/api/models"),
  listSessions: () => jsonFetch<{ sessions: ApiSession[] }>("/api/sessions"),
  createSession: (model: string) =>
    jsonFetch<{ session: ApiSession }>("/api/sessions", { method: "POST", body: JSON.stringify({ model }) }),
  renameSession: (id: string, title: string) =>
    jsonFetch<{ session: ApiSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteSession: (id: string) => jsonFetch<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),
  messages: (id: string) => jsonFetch<{ session: ApiSession; messages: ApiMessage[] }>(`/api/sessions/${id}/messages`),
  events: (limit = 40) => jsonFetch<{ events: ApiEvent[] }>(`/api/events?limit=${limit}`),
  dashboard: () => jsonFetch<DashProjection>("/api/projections/dashboard"),
};

export interface ChatCallbacks {
  onToken: (text: string) => void;
  onDone: (info: { messageId: string; cost: number; tokens: number; model: string; needsKey?: boolean }) => void;
  onError: (message: string) => void;
}

/**
 * Stream a chat turn from the backend over Server-Sent Events. Returns an
 * AbortController so the caller can cancel an in-flight generation.
 */
export function streamChat(
  body: { sessionId: string; content: string; model: string },
  cb: ChatCallbacks,
): AbortController {
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        cb.onError(res.status === 401 ? "Unauthorized — check your access token." : `${res.status} ${res.statusText}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === "token") cb.onToken((parsed as { text: string }).text);
          else if (event === "done") cb.onDone(parsed as Parameters<ChatCallbacks["onDone"]>[0]);
          else if (event === "error") cb.onError((parsed as { message: string }).message);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      cb.onError(err instanceof Error ? err.message : "Network error");
    }
  })();
  return controller;
}
