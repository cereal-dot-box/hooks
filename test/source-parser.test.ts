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

describe("parseSource (git shorthand)", () => {
  it("parses the github: prefix", () => {
    expect(parseSource("github:acme/hooks", work)).toEqual({
      sourceType: "git",
      host: "github.com",
      owner: "acme",
      repo: "hooks",
      cloneUrl: "https://github.com/acme/hooks",
    });
  });

  it("parses the bare owner/repo shorthand as github", () => {
    expect(parseSource("acme/hooks", work)).toEqual({
      sourceType: "git",
      host: "github.com",
      owner: "acme",
      repo: "hooks",
      cloneUrl: "https://github.com/acme/hooks",
    });
  });

  it("parses ref and subpath", () => {
    const r = parseSource("github:acme/hooks@v1.2.0#pkgs/banner", work);
    expect(r).toMatchObject({
      sourceType: "git",
      host: "github.com",
      owner: "acme",
      repo: "hooks",
      ref: "v1.2.0",
      subPath: "pkgs/banner",
    });
  });

  it("parses subpath without ref", () => {
    const r = parseSource("acme/hooks#pkgs/banner", work);
    expect(r).toMatchObject({ subPath: "pkgs/banner" });
  });

  it("trims trailing slashes off the subpath", () => {
    const r = parseSource("acme/hooks#pkgs/banner/", work);
    if (r.sourceType === "git") expect(r.subPath).toBe("pkgs/banner");
  });

  it("rejects invalid owner characters", () => {
    expect(() => parseSource("acme!/hooks", work)).toThrow(/unsupported source/);
  });

  it("rejects an empty repo", () => {
    expect(() => parseSource("acme/", work)).toThrow(/unsupported source/);
  });
});

describe("parseSource (repo URLs)", () => {
  it("parses a bare github URL", () => {
    const r = parseSource("https://github.com/acme/hooks", work);
    expect(r).toMatchObject({
      sourceType: "git",
      host: "github.com",
      owner: "acme",
      repo: "hooks",
      cloneUrl: "https://github.com/acme/hooks",
    });
  });

  it("parses a github tree URL with ref and path", () => {
    const r = parseSource("https://github.com/acme/hooks/tree/main/pkgs/banner", work);
    expect(r).toMatchObject({ host: "github.com", owner: "acme", repo: "hooks", ref: "main", subPath: "pkgs/banner" });
  });

  it("parses a github tree URL with ref only", () => {
    const r = parseSource("https://github.com/acme/hooks/tree/v1.2.0", work);
    expect(r).toMatchObject({ ref: "v1.2.0" });
  });

  it("strips .git and www", () => {
    const r = parseSource("https://www.github.com/acme/hooks.git", work);
    expect(r).toMatchObject({ sourceType: "git", owner: "acme", repo: "hooks" });
  });

  it("parses a gitlab tree URL", () => {
    const r = parseSource("https://gitlab.com/acme/hooks/-/tree/main/pkgs/banner", work);
    expect(r).toMatchObject({ host: "gitlab.com", ref: "main", subPath: "pkgs/banner" });
  });

  it("parses a bitbucket src URL", () => {
    const r = parseSource("https://bitbucket.org/acme/hooks/src/main/pkgs/banner", work);
    expect(r).toMatchObject({ host: "bitbucket.org", ref: "main", subPath: "pkgs/banner" });
  });

  it("parses a codeberg branch URL", () => {
    const r = parseSource("https://codeberg.org/acme/hooks/src/branch/main/pkgs/banner", work);
    expect(r).toMatchObject({ host: "codeberg.org", ref: "main", subPath: "pkgs/banner" });
  });

  it("accepts a generic host with owner/repo", () => {
    const r = parseSource("https://git.example.com/acme/hooks", work);
    expect(r).toMatchObject({ sourceType: "git", host: "git.example.com", owner: "acme", repo: "hooks" });
  });

  it("applies a #fragment subpath to URLs", () => {
    const r = parseSource("https://gitlab.com/acme/hooks#pkgs/banner", work);
    expect(r).toMatchObject({ host: "gitlab.com", subPath: "pkgs/banner" });
  });

  it("rejects URLs without owner/repo segments", () => {
    expect(() => parseSource("https://github.com/acme", work)).toThrow(/unsupported source/);
  });

  it("rejects non-http URLs", () => {
    expect(() => parseSource("file:///tmp/repo", work)).toThrow(/unsupported source/);
  });
});
