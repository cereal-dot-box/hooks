import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export type SourceType = "local";

export interface ResolvedSource {
  sourceType: SourceType;
  /** Absolute path to the package directory. */
  pkgDir: string;
  sourceUrl?: string;
  ref?: string;
}

function expandTilde(p: string): string {
  if (p === "~") return process.env.HOME ?? "~";
  if (p.startsWith("~/")) return `${process.env.HOME ?? ""}${p.slice(1)}`;
  return p;
}

/**
 * Resolve a source string to a local package directory.
 *
 * MVP supports local paths only (./, ../, /, ~, or a bare relative name).
 * Remote sources (github owner/repo, npm:, https URL) are post-MVP.
 */
export function parseSource(raw: string, cwd: string = process.cwd()): ResolvedSource {
  const trimmed = raw.trim();
  if (trimmed === "") throw new Error("source is empty");

  const looksLocal =
    trimmed === "." ||
    /^[./~]/.test(trimmed) ||
    (!trimmed.includes("/") && !trimmed.includes(":"));

  if (looksLocal) {
    const expanded = expandTilde(trimmed);
    const pkgDir = resolve(cwd, expanded);
    if (!existsSync(pkgDir) || !statSync(pkgDir).isDirectory()) {
      throw new Error(`local source is not a directory: ${pkgDir}`);
    }
    return { sourceType: "local", pkgDir };
  }

  throw new Error(
    `remote sources are not supported yet (got "${trimmed}"). Use a local path for now.`,
  );
}
