import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { MANIFEST_FILENAME } from "./constants.js";
import type { GitHubSource } from "./source-parser.js";

const DEFAULT_RAW_BASE = "https://raw.githubusercontent.com";

function rawBase(): string {
  return process.env.HOOKS_GH_RAW_URL ?? DEFAULT_RAW_BASE;
}

export interface StagedPackage {
  /** Temp directory holding hooks.json + files; caller must clean up. */
  pkgDir: string;
  sourceUrl: string;
}

async function fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, text: await res.text() };
}

function describe(src: GitHubSource): string {
  let s = `${src.owner}/${src.repo}`;
  if (src.ref) s += `@${src.ref}`;
  if (src.subPath) s += `#${src.subPath}`;
  return s;
}

/**
 * Fetch a github package (manifest + listed files) from GitHub raw into a
 * staged temp directory shaped exactly like a local package, so the rest of
 * the install pipeline runs unchanged.
 */
export async function fetchGithubPackage(src: GitHubSource, base = rawBase()): Promise<StagedPackage> {
  const ref = src.ref ?? "HEAD";
  const root = `${base}/${src.owner}/${src.repo}/${ref}`;
  const dirPrefix = src.subPath ? `${src.subPath}/` : "";

  const manifestRes = await fetchText(`${root}/${dirPrefix}${MANIFEST_FILENAME}`);
  if (!manifestRes.ok) {
    if (manifestRes.status === 404) {
      throw new Error(`no ${MANIFEST_FILENAME} found at ${describe(src)}`);
    }
    if (manifestRes.status === 403) {
      throw new Error(`GitHub rate limit hit while fetching ${describe(src)} — try again shortly`);
    }
    throw new Error(`failed to fetch ${MANIFEST_FILENAME} from ${describe(src)} (HTTP ${manifestRes.status})`);
  }

  let files: string[] = [];
  try {
    const parsed = JSON.parse(manifestRes.text) as { files?: unknown };
    if (Array.isArray(parsed.files)) files = parsed.files.filter((f): f is string => typeof f === "string");
  } catch {
    // Full validation happens downstream via loadManifest; a parse error here
    // surfaces there with the standard manifest error shape.
  }

  const pkgDir = mkdtempSync(join(tmpdir(), "hooks-pkg-"));
  const write = (rel: string, content: string) => {
    const out = join(pkgDir, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, content);
  };

  write(MANIFEST_FILENAME, manifestRes.text);

  for (const rel of files) {
    const fileRes = await fetchText(`${root}/${dirPrefix}${rel}`);
    if (!fileRes.ok) {
      throw new Error(
        fileRes.status === 404
          ? `package file not found: ${rel}`
          : `failed to fetch package file ${rel} (HTTP ${fileRes.status})`,
      );
    }
    write(rel, fileRes.text);
  }

  const repoUrl = `https://github.com/${src.owner}/${src.repo}`;
  const sourceUrl =
    src.ref || src.subPath
      ? `${repoUrl}/tree/${ref}${src.subPath ? `/${src.subPath}` : ""}`
      : repoUrl;

  return { pkgDir, sourceUrl };
}
