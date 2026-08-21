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
    if (r.sourceType === "local") expect(r.pkgDir).toBe(pkg);
  });

  it("resolves an absolute path", () => {
    const r = parseSource(pkg, work);
    expect(r.sourceType).toBe("local");
    if (r.sourceType === "local") expect(r.pkgDir).toBe(pkg);
  });

  it("resolves a bare relative name", () => {
    const r = parseSource("mypkg", work);
    expect(r.sourceType).toBe("local");
    if (r.sourceType === "local") expect(r.pkgDir).toBe(pkg);
  });

  it("expands ~ to HOME", () => {
    const home = process.env.HOME ?? "";
    const r = parseSource("~", work);
    if (r.sourceType === "local") expect(r.pkgDir).toBe(home);
  });

  it("throws on a nonexistent directory", () => {
    expect(() => parseSource(join(work, "nope"), work)).toThrow(/not a directory/);
  });
});

describe("parseSource (github)", () => {
  it("parses the github: prefix", () => {
    expect(parseSource("github:acme/hooks", work)).toEqual({
      sourceType: "github",
      owner: "acme",
      repo: "hooks",
    });
  });

  it("parses the bare owner/repo shorthand", () => {
    expect(parseSource("acme/hooks", work)).toEqual({
      sourceType: "github",
      owner: "acme",
      repo: "hooks",
    });
  });

  it("parses ref and subpath", () => {
    expect(parseSource("github:acme/hooks@v1.2.0#pkgs/banner", work)).toEqual({
      sourceType: "github",
      owner: "acme",
      repo: "hooks",
      ref: "v1.2.0",
      subPath: "pkgs/banner",
    });
  });

  it("parses subpath without ref", () => {
    expect(parseSource("acme/hooks#pkgs/banner", work)).toEqual({
      sourceType: "github",
      owner: "acme",
      repo: "hooks",
      subPath: "pkgs/banner",
    });
  });

  it("trims trailing slashes off the subpath", () => {
    const r = parseSource("acme/hooks#pkgs/banner/", work);
    if (r.sourceType === "github") expect(r.subPath).toBe("pkgs/banner");
  });

  it("rejects invalid owner characters", () => {
    expect(() => parseSource("acme!/hooks", work)).toThrow(/unsupported source/);
  });

  it("rejects an empty repo", () => {
    expect(() => parseSource("acme/", work)).toThrow(/unsupported source/);
  });
});
