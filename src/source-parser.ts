import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export type SourceType = "local" | "github";

export interface LocalSource {
  sourceType: "local";
  /** Absolute path to the package directory. */
  pkgDir: string;
}

export interface GitHubSource {
  sourceType: "github";
  owner: string;
  repo: string;
  /** Branch, tag, or commit sha. Defaults to the repo's default branch. */
  ref?: string;
  /** Directory inside the repo holding hooks.json. Defaults to the root. */
  subPath?: string;
}

export type ResolvedSource = LocalSource | GitHubSource;

const GITHUB_RE = /^github:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:@([A-Za-z0-9_./-]+))?(?:#([A-Za-z0-9_./-]+))?$/;
const SHORTHAND_RE = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:@([A-Za-z0-9_./-]+))?(?:#([A-Za-z0-9_./-]+))?$/;

function expandTilde(p: string): string {
  if (p === "~") return process.env.HOME ?? "~";
  if (p.startsWith("~/")) return `${process.env.HOME ?? ""}${p.slice(1)}`;
  return p;
}

/**
 * Resolve a source string to a package location.
 *
 * Local: ./, ../, /, ~, or a bare relative name.
 * GitHub: `github:owner/repo[@ref][#path]` or the bare shorthand
 * `owner/repo[@ref][#path]` — installed by fetching from GitHub raw.
 * npm: and https URL sources are post-MVP.
 */
export function parseSource(raw: string, cwd: string = process.cwd()): ResolvedSource {
  const trimmed = raw.trim();
  if (trimmed === "") throw new Error("source is empty");

  const prefixed = GITHUB_RE.exec(trimmed);
  if (prefixed) {
    return githubFromMatch(prefixed, trimmed);
  }

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

  const shorthand = SHORTHAND_RE.exec(trimmed);
  if (shorthand) {
    return githubFromMatch(shorthand, trimmed);
  }

  throw new Error(
    `unsupported source "${trimmed}". Use a local path, github:owner/repo[@ref][#path], or owner/repo.`,
  );
}

function githubFromMatch(m: RegExpExecArray, raw: string): GitHubSource {
  const [, owner, repo, ref, subPath] = m;
  if (!owner || !repo) throw new Error(`invalid github source: "${raw}"`);
  const src: GitHubSource = { sourceType: "github", owner, repo };
  if (ref) src.ref = ref;
  if (subPath) src.subPath = subPath.replace(/\/+$/, "");
  return src;
}
