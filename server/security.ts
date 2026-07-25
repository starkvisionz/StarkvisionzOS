// Authentication, CORS, rate limiting, and request-budget guards.
//
// The API is protected by a single shared bearer token (SVOS_AUTH_TOKEN). It is
// designed for a self-hosted/personal deployment: set the token on the server,
// and the browser client presents it. If no token is configured, the API only
// serves loopback requests and refuses anything from a remote address — so an
// unconfigured public deployment is closed by default, not wide open.

import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const AUTH_TOKEN = process.env.SVOS_AUTH_TOKEN || "";
export const AUTH_REQUIRED = AUTH_TOKEN.length > 0;
export const ACTOR = process.env.SVOS_ACTOR || "operator";
export const ALLOWED_ORIGINS = (process.env.SVOS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// budgets / limits (overridable via env)
export const MAX_PROMPT_CHARS = Number(process.env.SVOS_MAX_PROMPT_CHARS || 24000);
export const MAX_OUTPUT_TOKENS = Number(process.env.SVOS_MAX_OUTPUT_TOKENS || 8192);
export const RATE_LIMIT = Number(process.env.SVOS_RATE_LIMIT || 30); // requests
export const RATE_WINDOW_MS = Number(process.env.SVOS_RATE_WINDOW_MS || 60_000);
export const CHAT_LIMIT = Number(process.env.SVOS_CHAT_LIMIT || 10); // chat turns / window

function eq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isLoopback(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/** CORS: closed by default. Only echoes an allowed origin when explicitly
 *  configured via SVOS_ALLOWED_ORIGINS. (Same-origin — dev proxy and the prod
 *  static server — needs no CORS headers.) */
export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (AUTH_REQUIRED) {
    const h = req.header("authorization") || "";
    const provided = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (provided && eq(provided, AUTH_TOKEN)) return next();
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  // no token configured — allow loopback only, refuse remote callers
  if (isLoopback(req)) return next();
  res.status(401).json({ error: "auth not configured; set SVOS_AUTH_TOKEN to allow remote access" });
}

// ── simple fixed-window rate limiter ──
const buckets = new Map<string, { count: number; reset: number }>();

function key(req: Request, scope: string): string {
  const h = req.header("authorization") || "";
  const id = h ? "tok:" + h.slice(-12) : "ip:" + (req.ip || "unknown");
  return scope + ":" + id;
}

export function rateLimit(scope: string, max: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const k = key(req, scope);
    const now = Date.now();
    const b = buckets.get(k);
    if (!b || now > b.reset) {
      buckets.set(k, { count: 1, reset: now + RATE_WINDOW_MS });
      return next();
    }
    if (b.count >= max) {
      res.setHeader("Retry-After", Math.ceil((b.reset - now) / 1000));
      res.status(429).json({ error: "rate limit exceeded" });
      return;
    }
    b.count += 1;
    next();
  };
}
