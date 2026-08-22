import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export type SourceType = "local" | "git";

export interface LocalSource {
  sourceType: "local";
  /** Absolute path to the package directory. */
  pkgDir: string;
}

export interface GitSource {
  sourceType: "git";
  /** Clone host, e.g. "github.com". */
  host: string;
  owner: string;
  repo: string;
  /** Branch or tag. Defaults to the repo's default branch. */
  ref?: string;
  /** Directory inside the repo holding hooks.json. Defaults to discovery. */
  subPath?: string;
  /** https clone URL. */
  cloneUrl: string;
}

export type ResolvedSource = LocalSource | GitSource;

const SEGMENT = "[A-Za-z0-9_.-]+";
const GITHUB_RE = new RegExp(`^github:(${SEGMENT})/(${SEGMENT})(?:@([A-Za-z0-9_./-]+))?(?:#([A-Za-z0-9_./-]+))?$`);
const SHORTHAND_RE = new RegExp(`^(${SEGMENT})/(${SEGMENT})(?:@([A-Za-z0-9_./-]+))?(?:#([A-Za-z0-9_./-]+))?$`);

/** Path markers each forge uses between repo and ref in tree URLs. */
const TREE_MARKERS: Record<string, string[]> = {
  "github.com": ["tree"],
  "gitlab.com": ["-/tree"],
  "bitbucket.org": ["src"],
  "codeberg.org": ["src/branch", "src/tag", "src/commit"],
};

function expandTilde(p: string): string {
  if (p === "~") return process.env.HOME ?? "~";
  if (p.startsWith("~/")) return `${process.env.HOME ?? ""}${p.slice(1)}`;
  return p;
}

function gitSource(host: string, owner: string, repo: string, ref?: string, subPath?: string): GitSource {
  const src: GitSource = { sourceType: "git", host, owner, repo, cloneUrl: `https://${host}/${owner}/${repo}` };
  if (ref) src.ref = ref;
  if (subPath) src.subPath = subPath.replace(/^\/+|\/+$/g, "");
  return src;
}

/**
 * Resolve a source string to a package location.
 *
 * Local: ./, ../, /, ~, or a bare relative name.
 * Git: a repo URL (https://github.com/owner/repo[/tree/ref/path], same for
 * gitlab/bitbucket/codeberg, or a generic https://host/owner/repo), the
 * shorthand `owner/repo[@ref][#path]`, or `github:owner/repo[@ref][#path]`.
 * A `#path` fragment selects a subdirectory on any spelling.
 */
export function parseSource(raw: string, cwd: string = process.cwd()): ResolvedSource {
  const trimmed = raw.trim();
  if (trimmed === "") throw new Error("source is empty");

  // Local check first: a ./ or ~ prefix must never fall through to the
  // owner/repo shorthand (dot is legal in the owner charset).
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

  const fragmentIdx = trimmed.indexOf("#");
  const fragment = fragmentIdx >= 0 ? trimmed.slice(fragmentIdx + 1) : undefined;
  const noFragment = fragmentIdx >= 0 ? trimmed.slice(0, fragmentIdx) : trimmed;

  const prefixed = GITHUB_RE.exec(noFragment);
  if (prefixed) return withFragment(gitSource("github.com", prefixed[1]!, prefixed[2]!, prefixed[3]), fragment);

  const shorthand = SHORTHAND_RE.exec(noFragment);
  if (shorthand) return withFragment(gitSource("github.com", shorthand[1]!, shorthand[2]!, shorthand[3]), fragment);

  const url = parseRepoUrl(noFragment);
  if (url) return withFragment(url, fragment);

  throw new Error(
    `unsupported source "${trimmed}". Use a local path, a repo URL (https://github.com/owner/repo), or owner/repo.`,
  );
}

function withFragment(src: GitSource, fragment: string | undefined): GitSource {
  if (fragment) src.subPath = fragment.replace(/^\/+|\/+$/g, "");
  return src;
}

/**
 * Parse an https repo URL. Known forges accept their tree-URL form
 * (…/tree/main/sub/dir); any host accepts the bare owner/repo form.
 */
function parseRepoUrl(raw: string): GitSource | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  if (segments.length < 2) return null;

  const [owner, repo, ...rest] = segments;
  const cleanRepo = repo!.replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner!) || !/^[A-Za-z0-9_.-]+$/.test(cleanRepo)) return null;

  for (const marker of TREE_MARKERS[host] ?? []) {
    const parts = marker.split("/");
    if (rest.length > parts.length && rest.slice(0, parts.length).join("/") === marker) {
      const after = rest.slice(parts.length);
      const ref = after.shift();
      const subPath = after.join("/");
      return gitSource(host, owner!, cleanRepo, ref || undefined, subPath || undefined);
    }
  }

  // Bare owner/repo form on any host; extra path segments are ignored.
  return gitSource(host, owner!, cleanRepo);
}
