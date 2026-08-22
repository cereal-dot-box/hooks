import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cloneSource } from "../src/git-source.js";
import { parseSource } from "../src/source-parser.js";
import { gitInitRepo } from "./git-fixture.js";

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "ah-git-"));
});
afterEach(() => {
  rmSync(work, { recursive: true, force: true });
  delete process.env.HOOKS_GIT_URL_BASE;
});

function src(raw: string) {
  const r = parseSource(raw, work);
  if (r.sourceType !== "git") throw new Error("expected git source");
  return r;
}

describe("cloneSource", () => {
  it("shallow-clones the repo and stages the tree", async () => {
    gitInitRepo(join(work, "acme/hooks"), {
      "hooks.json": JSON.stringify({ name: "pkg", hooks: [{ id: "h", event: "Stop", command: "echo hi" }] }),
      "scripts/run.sh": "echo run",
    });
    process.env.HOOKS_GIT_URL_BASE = work;

    const staged = await cloneSource(src("github:acme/hooks"));
    expect(existsSync(join(staged.rootDir, "hooks.json"))).toBe(true);
    expect(readFileSync(join(staged.rootDir, "scripts/run.sh"), "utf8")).toBe("echo run");
    expect(staged.sourceUrl).toBe("https://github.com/acme/hooks");
    rmSync(staged.tempDir, { recursive: true, force: true });
  });

  it("clones at a tag ref", async () => {
    gitInitRepo(
      join(work, "acme/hooks"),
      {
        "hooks.json": JSON.stringify({ name: "pkg", hooks: [{ id: "h", event: "Stop", command: "echo v1" }] }),
      },
      { tag: "v1.0.0" },
    );
    process.env.HOOKS_GIT_URL_BASE = work;

    const staged = await cloneSource(src("acme/hooks@v1.0.0"));
    const manifest = JSON.parse(readFileSync(join(staged.rootDir, "hooks.json"), "utf8"));
    expect(manifest.hooks[0].command).toBe("echo v1");
    rmSync(staged.tempDir, { recursive: true, force: true });
  });

  it("builds sourceUrl with ref and subpath", async () => {
    gitInitRepo(join(work, "acme/hooks"), {
      "pkgs/banner/hooks.json": JSON.stringify({ name: "banner", hooks: [{ id: "b", event: "Stop", command: "echo b" }] }),
    });
    process.env.HOOKS_GIT_URL_BASE = work;

    const staged = await cloneSource(src("github:acme/hooks@main#pkgs/banner"));
    expect(staged.sourceUrl).toBe("https://github.com/acme/hooks/tree/main/pkgs/banner");
    rmSync(staged.tempDir, { recursive: true, force: true });
  });

  it("errors clearly on a missing repo", async () => {
    process.env.HOOKS_GIT_URL_BASE = work;
    await expect(cloneSource(src("github:acme/nope"))).rejects.toThrow(/failed to clone/);
  });
});
