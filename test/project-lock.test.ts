import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readProjectLock,
  removeProjectPackage,
  upsertProjectPackage,
  writeProjectLock,
} from "../src/project-lock.js";
import type { ProjectLock, ProjectLockEntry } from "../src/types.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ah-pl-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function entry(name: string): ProjectLockEntry {
  return {
    name,
    source: "./x",
    sourceType: "local",
    manifestHash: "h",
    agents: ["codex", "claude-code"],
    hooks: [
      { id: "z", event: "Stop" },
      { id: "a", event: "Stop" },
    ],
  };
}

describe("project lock", () => {
  it("reads empty when the file is missing", () => {
    expect(readProjectLock(dir).packages).toEqual([]);
  });

  it("writes alphabetically sorted by package name, agents, and hook id", () => {
    let lock: ProjectLock = { schemaVersion: 1, packages: [entry("zeta"), entry("alpha")] };
    writeProjectLock(lock, dir);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onDisk = JSON.parse(readFileSync(join(dir, "hooks-lock.json"), "utf8")) as any;
    expect(onDisk.packages.map((p: { name: string }) => p.name)).toEqual(["alpha", "zeta"]);
    expect(onDisk.packages[0].agents).toEqual(["claude-code", "codex"]);
    expect(onDisk.packages[0].hooks.map((h: { id: string }) => h.id)).toEqual(["a", "z"]);
  });

  it("upsert replaces same-named entry; remove drops it", () => {
    let lock: ProjectLock = { schemaVersion: 1, packages: [] };
    lock = upsertProjectPackage(lock, entry("a"));
    lock = upsertProjectPackage(lock, entry("b"));
    expect(lock.packages.map((p) => p.name).sort()).toEqual(["a", "b"]);
    lock = upsertProjectPackage(lock, entry("a"));
    expect(lock.packages).toHaveLength(2);
    lock = removeProjectPackage(lock, "a");
    expect(lock.packages.map((p) => p.name)).toEqual(["b"]);
  });
});
