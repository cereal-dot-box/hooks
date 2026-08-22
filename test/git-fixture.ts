import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Create a committed local git repo at `dir` with the given files. */
export function gitInitRepo(
  dir: string,
  files: Record<string, string>,
  opts: { tag?: string } = {},
): void {
  mkdirSync(dir, { recursive: true });
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "--quiet", "-b", "main"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "test"]);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  git(["add", "-A"]);
  git(["commit", "--quiet", "-m", "init"]);
  if (opts.tag) git(["tag", opts.tag]);
}
