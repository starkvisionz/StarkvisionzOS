// Anthropic client + the real Claude model roster the app routes to.
//
// The design's original picker listed several providers; with a real backend
// the honest thing is to route to real Claude models. Pricing is used to turn
// the API's reported token usage into a real per-turn dollar cost.

import Anthropic from "@anthropic-ai/sdk";

export interface ModelDef {
  id: string; // Anthropic model id
  name: string;
  sub: string;
  dot: string;
  inPrice: number; // $ / 1M input tokens
  outPrice: number; // $ / 1M output tokens
}

export const MODELS: ModelDef[] = [
  { id: "claude-opus-5", name: "Claude Opus", sub: "Opus 5 · most capable", dot: "var(--color-accent)", inPrice: 5, outPrice: 25 },
  { id: "claude-sonnet-5", name: "Claude Sonnet", sub: "Sonnet 5 · balanced", dot: "#c9a27f", inPrice: 3, outPrice: 15 },
  { id: "claude-haiku-4-5", name: "Claude Haiku", sub: "Haiku 4.5 · fast", dot: "#7fbfa8", inPrice: 1, outPrice: 5 },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", sub: "prior Opus", dot: "var(--color-accent-400)", inPrice: 5, outPrice: 25 },
];

export const DEFAULT_MODEL = "claude-opus-5";

export function modelById(id: string): ModelDef {
  return MODELS.find((m) => m.id === id) || MODELS[0];
}

export function costFor(id: string, inputTokens: number, outputTokens: number): number {
  const m = modelById(id);
  return (inputTokens / 1_000_000) * m.inPrice + (outputTokens / 1_000_000) * m.outPrice;
}

export function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export const CHAT_SYSTEM =
  "You are Claude, an agent operating inside Starkvisionz OS — an event-sourced AI workspace. " +
  "Every turn is logged as an immutable event. Be concise, decisive, and helpful; when a request " +
  "has a tradeoff, state it and give a recommendation rather than an exhaustive survey. " +
  "Format responses in GitHub-flavored markdown. Do not include internal or system XML tags in your response.";
