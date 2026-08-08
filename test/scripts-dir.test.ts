import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyScripts, rmScriptsDir, scriptsDirFor } from "../src/scripts-dir.js";

let root: string;
let src: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ah-sd-root-"));
  src = mkdtempSync(join(tmpdir(), "ah-sd-src-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(src, { recursive: true, force: true });
});

describe("scripts-dir", () => {
  it("copies files preserving relative structure", () => {
    mkdirSync(join(src, "scripts"), { recursive: true });
    writeFileSync(join(src, "scripts", "a.mjs"), "hello");
    const dest = copyScripts("pkg", "hash1", ["scripts/a.mjs"], src, root);
    expect(readFileSync(join(dest, "scripts", "a.mjs"), "utf8")).toBe("hello");
  });

  it("is idempotent — a second call returns the same dir without error", () => {
    writeFileSync(join(src, "a.mjs"), "x");
    const d1 = copyScripts("pkg", "h", ["a.mjs"], src, root);
    const d2 = copyScripts("pkg", "h", ["a.mjs"], src, root);
    expect(d1).toBe(d2);
  });

  it("throws when a declared file is missing from the package", () => {
    expect(() => copyScripts("pkg", "h", ["nope.mjs"], src, root)).toThrow(/not found/);
  });

  it("rmScriptsDir removes all versions under the package", () => {
    writeFileSync(join(src, "a.mjs"), "x");
    copyScripts("pkg", "h1", ["a.mjs"], src, root);
    copyScripts("pkg", "h2", ["a.mjs"], src, root);
    rmScriptsDir("pkg", root);
    expect(existsSync(join(root, "pkg"))).toBe(false);
  });

  it("scriptsDirFor sanitizes unsafe package names", () => {
    expect(scriptsDirFor("../evil", "h", root)).toBe(join(root, ".._evil", "h"));
  });
});
