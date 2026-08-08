import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseSource } from "../src/source-parser.js";

let work: string;
let pkg: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "ah-sp-"));
  pkg = join(work, "mypkg");
  mkdirSync(pkg, { recursive: true });
});
afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

describe("parseSource (local)", () => {
  it("resolves a ./relative path", () => {
    const r = parseSource("./mypkg", work);
    expect(r.sourceType).toBe("local");
    expect(r.pkgDir).toBe(pkg);
  });

  it("resolves an absolute path", () => {
    expect(parseSource(pkg, work).pkgDir).toBe(pkg);
  });

  it("resolves a bare relative name", () => {
    expect(parseSource("mypkg", work).pkgDir).toBe(pkg);
  });

  it("expands ~ to HOME", () => {
    const home = process.env.HOME ?? "";
    expect(parseSource("~", work).pkgDir).toBe(home);
  });

  it("throws on a nonexistent directory", () => {
    expect(() => parseSource(join(work, "nope"), work)).toThrow(/not a directory/);
  });

  it("throws on a remote-looking source", () => {
    expect(() => parseSource("owner/repo", work)).toThrow(/not supported yet/);
  });
});
