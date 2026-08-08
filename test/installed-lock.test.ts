import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  emptyGlobalLock,
  getPackage,
  readGlobalLock,
  removePackageEntry,
  upsertPackage,
  writeGlobalLock,
} from "../src/installed-lock.js";
import type { PackageInstall } from "../src/types.js";

let dir: string;
const lockPath = () => join(dir, "installed.json");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ah-gl-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function pkg(name: string, hash = "abc123"): PackageInstall {
  return {
    name,
    source: "./x",
    sourceType: "local",
    resolvedAt: "t",
    manifestHash: hash,
    agents: ["claude-code"],
    configPaths: { "claude-code": "/c" },
    entries: [],
    installedAt: "t",
    updatedAt: "t",
  };
}

describe("global lock", () => {
  it("reads empty when the file is missing", () => {
    expect(readGlobalLock(lockPath())).toEqual(emptyGlobalLock());
  });

  it("round-trips through write/read", () => {
    let lock = emptyGlobalLock();
    lock = upsertPackage(lock, pkg("a"));
    writeGlobalLock(lock, lockPath());
    expect(getPackage(readGlobalLock(lockPath()), "a")).toBeDefined();
  });

  it("upsert replaces an existing package", () => {
    let lock = upsertPackage(emptyGlobalLock(), pkg("a"));
    lock = upsertPackage(lock, pkg("a", "newhash"));
    expect(getPackage(lock, "a")?.manifestHash).toBe("newhash");
  });

  it("remove deletes a package and is a no-op when absent", () => {
    let lock = upsertPackage(emptyGlobalLock(), pkg("a"));
    lock = removePackageEntry(lock, "a");
    expect(getPackage(lock, "a")).toBeUndefined();
    expect(removePackageEntry(lock, "missing")).toBe(lock);
  });
});
