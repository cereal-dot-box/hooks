import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import type { GitSource } from "./source-parser.js";

const execFileAsync = promisify(execFile);

export interface StagedRepo {
  /** Clone root. */
  rootDir: string;
  /** Temp dir holding the clone; caller must clean up. */
  tempDir: string;
  sourceUrl: string;
}

function gitUrl(src: GitSource): string {
  const base = process.env.HOOKS_GIT_URL_BASE;
  return base ? `${base.replace(/\/+$/, "")}/${src.owner}/${src.repo}` : src.cloneUrl;
}

async function git(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("git", args, { timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
}

export async function assertGitAvailable(): Promise<void> {
  try {
    await git(["--version"]);
  } catch {
    throw new Error("git is required for remote sources but was not found on PATH");
  }
}

/**
 * Shallow-clone a git source into a temp directory. The whole repo comes
 * down (any forge, any layout); package discovery then scans the local tree.
 */
export async function cloneSource(src: GitSource): Promise<StagedRepo> {
  await assertGitAvailable();

  const tempDir = mkdtempSync(join(tmpdir(), "hooks-src-"));
  const target = join(tempDir, "repo");
  const args = ["clone", "--quiet", "--depth", "1"];
  if (src.ref) args.push("--branch", src.ref);
  args.push("--", gitUrl(src), target);

  try {
    await git(args);
  } catch (err) {
    throw cloneError(src, err);
  }

  const repoUrl = `https://${src.host}/${src.owner}/${src.repo}`;
  const refPath = src.ref ?? (src.subPath ? "HEAD" : "");
  const parts = [repoUrl];
  if (refPath) parts.push("tree", refPath);
  if (src.subPath) {
    if (!refPath) parts.push("tree", "HEAD");
    parts.push(...src.subPath.split("/"));
  }
  return { rootDir: target, tempDir, sourceUrl: parts.join("/") };
}

function cloneError(src: GitSource, err: unknown): Error {
  const detail =
    err && typeof err === "object" && "stderr" in err && typeof err.stderr === "string"
      ? err.stderr.trim().split("\n").pop()
      : err instanceof Error
        ? err.message
        : String(err);
  const hint = /not found|does not exist|Repository not found/i.test(String(detail))
    ? ` — does ${src.owner}/${src.repo} exist on ${src.host}?`
    : /Authentication|credentials|403|Access denied/i.test(String(detail))
      ? " — the repo may be private"
      : "";
  return new Error(`failed to clone ${src.cloneUrl}${hint}\n${detail ?? ""}`.trim());
}
