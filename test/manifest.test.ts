import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ManifestValidationError } from "../src/errors.js";
import { loadManifest, validateManifest } from "../src/manifest.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = join(here, "fixtures", "example-pkg");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ah-mf-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadManifest — fixture", () => {
  it("loads the example-pkg fixture with a 12-hex hash", () => {
    const loaded = loadManifest(FIXTURE);
    expect(loaded.manifest.name).toBe("example-pkg");
    expect(loaded.manifest.hooks).toHaveLength(3);
    expect(loaded.manifestHash).toMatch(/^[a-f0-9]{12}$/);
  });
});

describe("validateManifest", () => {
  const ok = { name: "p", hooks: [{ id: "a", event: "Stop", command: "echo x" }] };

  it("accepts a minimal valid manifest", () => {
    expect(() => validateManifest(ok, join(dir, "hooks.json"))).not.toThrow();
  });

  it("rejects missing name", () => {
    expect(() =>
      validateManifest({ hooks: [] }, join(dir, "hooks.json")),
    ).toThrow(ManifestValidationError);
  });

  it("rejects empty hooks", () => {
    expect(() =>
      validateManifest({ name: "p", hooks: [] }, join(dir, "hooks.json")),
    ).toThrow(ManifestValidationError);
  });

  it("rejects invalid id", () => {
    expect(() =>
      validateManifest(
        { name: "p", hooks: [{ id: "Bad Id", event: "Stop", command: "x" }] },
        join(dir, "hooks.json"),
      ),
    ).toThrow(ManifestValidationError);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      validateManifest(
        {
          name: "p",
          hooks: [
            { id: "a", event: "Stop", command: "x" },
            { id: "a", event: "Stop", command: "y" },
          ],
        },
        join(dir, "hooks.json"),
      ),
    ).toThrow(ManifestValidationError);
  });

  it("rejects unsupported event", () => {
    expect(() =>
      validateManifest(
        { name: "p", hooks: [{ id: "a", event: "NotAnEvent", command: "x" }] },
        join(dir, "hooks.json"),
      ),
    ).toThrow(ManifestValidationError);
  });

  it("rejects empty command", () => {
    expect(() =>
      validateManifest(
        { name: "p", hooks: [{ id: "a", event: "Stop", command: "" }] },
        join(dir, "hooks.json"),
      ),
    ).toThrow(ManifestValidationError);
  });
});

describe("loadManifest — file errors", () => {
  it("throws ManifestValidationError when the file is missing", () => {
    expect(() => loadManifest(dir)).toThrow(ManifestValidationError);
  });

  it("throws ManifestValidationError on unparseable JSON", () => {
    writeFileSync(join(dir, "hooks.json"), "{ not json");
    expect(() => loadManifest(dir)).toThrow(ManifestValidationError);
  });
});
