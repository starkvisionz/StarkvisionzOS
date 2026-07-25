import type { CSSProperties } from "react";

/**
 * Parse a CSS declaration string into a React style object.
 *
 * The design prototype expresses every style as an inline CSS string. Rather
 * than hand-translate each one (and risk drift from the source), we keep the
 * strings verbatim and convert at render time. Custom properties (`--foo`) are
 * preserved as-is; standard properties are camelCased. Empty fragments — which
 * appear where the prototype interpolates a conditional declaration like
 * `{{ spin }}` that may be blank — are skipped.
 */
export function css(input: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const raw of input.split(";")) {
    const decl = raw.trim();
    if (!decl) continue;
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    const key = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = value;
  }
  return out as CSSProperties;
}
