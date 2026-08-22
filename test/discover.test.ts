import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discoverPackages, selectPackage } from "../src/discover.js";

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "ah-disc-"));
});
afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

const MANIFEST = (name: string, hookIds: string[]) =>
  JSON.stringify({
    name,
    hooks: hookIds.map((id) => ({ id, event: "Stop", command: `echo ${id}` })),
  });

function write(dir: string, rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

describe("discoverPackages", () => {
  it("finds the root package and nested packages", () => {
    write(work, "hooks.json", MANIFEST("root-pkg", ["a"]));
    write(work, "pkgs/banner/hooks.json", MANIFEST("banner", ["b"]));
    write(work, "pkgs/audit/hooks.json", MANIFEST("audit", ["c", "d"]));

    const found = discoverPackages(work);
    expect(found.map((p) => p.relPath)).toEqual([undefined, "pkgs/audit", "pkgs/banner"]);
  });

  it("skips invalid manifests and dot/node_modules dirs", () => {
    write(work, ".hidden/hooks.json", MANIFEST("hidden", ["a"]));
    write(work, "node_modules/pkg/hooks.json", MANIFEST("nm", ["a"]));
    write(work, "broken/hooks.json", "{ not json");
    write(work, "noname/hooks.json", JSON.stringify({ hooks: [] }));

    expect(discoverPackages(work)).toEqual([]);
  });
});

describe("selectPackage", () => {
  const setup = () => {
    write(work, "pkgs/banner/hooks.json", MANIFEST("banner", ["print-banner"]));
    write(work, "pkgs/audit/hooks.json", MANIFEST("audit", ["log-bash", "log-write"]));
    return discoverPackages(work);
  };

  it("single package installs whole", () => {
    write(work, "pkgs/only/hooks.json", MANIFEST("only", ["a"]));
    const sel = selectPackage(discoverPackages(work), {});
    expect(sel.pkg.manifest.name).toBe("only");
    expect(sel.hookIds).toBeUndefined();
  });

  it("multiple packages error lists options", () => {
    const found = setup();
    expect(() => selectPackage(found, {})).toThrow(/--hook/);
  });

  it("--hook matching a hook id filters to that hook", () => {
    const found = setup();
    const sel = selectPackage(found, { hookFilter: "log-bash" });
    expect(sel.pkg.manifest.name).toBe("audit");
    expect(sel.hookIds).toEqual(["log-bash"]);
  });

  it("--hook matching a package name installs it whole", () => {
    const found = setup();
    const sel = selectPackage(found, { hookFilter: "banner" });
    expect(sel.pkg.manifest.name).toBe("banner");
    expect(sel.hookIds).toBeUndefined();
  });

  it("root package wins without flags even alongside subpackages", () => {
    write(work, "hooks.json", MANIFEST("root-pkg", ["a"]));
    const found = setup();
    const sel = selectPackage(found, {});
    expect(sel.pkg.manifest.name).toBe("root-pkg");
  });

  it("subPath must hold a manifest", () => {
    const found = setup();
    expect(() => selectPackage(found, { subPath: "pkgs/none" })).toThrow(/no hooks\.json/);
    expect(selectPackage(found, { subPath: "pkgs/banner" }).pkg.manifest.name).toBe("banner");
  });

  it("unknown --hook names available packages", () => {
    const found = setup();
    try {
      selectPackage(found, { hookFilter: "nope" });
      expect.unreachable("expected an error");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("banner");
      expect(msg).toContain("audit");
    }
  });
});
