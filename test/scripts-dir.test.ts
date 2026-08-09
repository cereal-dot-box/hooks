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
    const dest = copyScripts("my-hook", ["scripts/a.mjs"], src, root);
    expect(readFileSync(join(dest, "scripts", "a.mjs"), "utf8")).toBe("hello");
  });

  it("overwrites on re-copy so updates propagate", () => {
    writeFileSync(join(src, "a.mjs"), "v1");
    const d1 = copyScripts("my-hook", ["a.mjs"], src, root);
    writeFileSync(join(src, "a.mjs"), "v2");
    const d2 = copyScripts("my-hook", ["a.mjs"], src, root);
    expect(d1).toBe(d2);
    expect(readFileSync(join(d2, "a.mjs"), "utf8")).toBe("v2");
  });

  it("throws when a declared file is missing from the package", () => {
    expect(() => copyScripts("my-hook", ["nope.mjs"], src, root)).toThrow(/not found/);
  });

  it("rmScriptsDir removes the hook dir but leaves siblings", () => {
    writeFileSync(join(src, "a.mjs"), "x");
    copyScripts("hook-a", ["a.mjs"], src, root);
    copyScripts("hook-b", ["a.mjs"], src, root);
    rmScriptsDir("hook-a", root);
    expect(existsSync(join(root, "hook-a"))).toBe(false);
    expect(existsSync(join(root, "hook-b"))).toBe(true);
  });

  it("scriptsDirFor sanitizes unsafe hook ids", () => {
    expect(scriptsDirFor("../evil", root)).toBe(join(root, ".._evil"));
  });
});
