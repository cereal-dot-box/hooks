import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installHooksIntoConfig, installHooksIntoObject, removeHooksFromConfig } from "../src/merge-engine.js";
import type { HookEvent, PreparedEntry } from "../src/types.js";

let dir: string;
const p = (...parts: string[]): string => join(dir, ...parts);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ah-test-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function entry(
  id: string,
  event: HookEvent,
  command: string,
  extras: Record<string, unknown> = {},
  matcher?: string,
): PreparedEntry {
  return { hooksId: id, event, command, extras, matcher };
}

const read = (file: string): unknown => JSON.parse(readFileSync(p(file), "utf8"));

describe("installHooksIntoObject — pure core", () => {
  it("installs into {} with correct nested structure and markers", () => {
    const root: Record<string, unknown> = {};
    const { changed, results } = installHooksIntoObject(root, [
      entry("pkg:hook1", "SessionStart", "echo hi"),
    ]);
    expect(changed).toBe(true);
    expect(results).toEqual([{ hooksId: "pkg:hook1", status: "added" }]);
    expect(root).toEqual({
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: "command", command: "echo hi", managedBy: "hooks", hooksId: "pkg:hook1" },
            ],
          },
        ],
      },
    });
  });

  it("leaves user-authored entries untouched and appends ours", () => {
    const root: Record<string, unknown> = {
      hooks: { Stop: [{ hooks: [{ type: "command", command: "user-cmd" }] }] },
    };
    const { results } = installHooksIntoObject(root, [entry("pkg:s1", "Stop", "our-cmd")]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group = (root.hooks as any).Stop[0];
    expect(group.hooks).toEqual([
      { type: "command", command: "user-cmd" },
      { type: "command", command: "our-cmd", managedBy: "hooks", hooksId: "pkg:s1" },
    ]);
    expect(results[0]?.status).toBe("added");
  });

  it("creates a new matcher-group when matcher differs and preserves the user group", () => {
    const root: Record<string, unknown> = {
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "user-bash" }] }],
      },
    };
    installHooksIntoObject(root, [entry("pkg:r", "PreToolUse", "our-read", {}, "Read")]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = (root.hooks as any).PreToolUse;
    expect(groups).toHaveLength(2);
    const readGroup = groups.find((g: { matcher?: string }) => g.matcher === "Read");
    const bashGroup = groups.find((g: { matcher?: string }) => g.matcher === "Bash");
    expect(readGroup.hooks[0].hooksId).toBe("pkg:r");
    expect(bashGroup.hooks).toEqual([{ type: "command", command: "user-bash" }]);
  });
});

describe("installHooksIntoConfig — file I/O", () => {
  it("re-running is byte-identical and reports all already-present", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, "{}\n");
    const e = [entry("pkg:s", "SessionStart", "echo hi")];
    const r1 = installHooksIntoConfig(cfg, e);
    expect(r1.entries.every((r) => r.status === "added")).toBe(true);
    const after1 = readFileSync(cfg, "utf8");
    const r2 = installHooksIntoConfig(cfg, e);
    expect(r2.changed).toBe(false);
    expect(r2.entries.every((r) => r.status === "already-present")).toBe(true);
    expect(readFileSync(cfg, "utf8")).toBe(after1);
    expect(r2.output).toBe(after1);
  });

  it("updates a drifted entry in place, preserving markers", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, "{}\n");
    installHooksIntoConfig(cfg, [entry("pkg:s", "SessionStart", "echo old")]);
    const r = installHooksIntoConfig(cfg, [entry("pkg:s", "SessionStart", "echo new")]);
    expect(r.entries[0]?.status).toBe("updated");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hook = (read("settings.json") as any).hooks.SessionStart[0].hooks[0];
    expect(hook.command).toBe("echo new");
    expect(hook.hooksId).toBe("pkg:s");
    expect(hook.managedBy).toBe("hooks");
  });

  it("supports no-marker install and payload-based removal", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, "{}\n");
    installHooksIntoConfig(cfg, [entry("pkg:s", "Stop", "echo stop")], { mark: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hook = (read("settings.json") as any).hooks.Stop[0].hooks[0];
    expect(hook).toEqual({ type: "command", command: "echo stop" });
    const r = removeHooksFromConfig(cfg, [{ event: "Stop", command: "echo stop" }]);
    expect(r.removed).toHaveLength(1);
    expect(read("settings.json")).toEqual({});
  });

  it("preserves 2-space indent and final newline", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, '{\n  "hooks": {}\n}\n');
    installHooksIntoConfig(cfg, [entry("pkg:s", "SessionStart", "echo hi")]);
    const out = readFileSync(cfg, "utf8");
    expect(out).toContain('\n  "hooks"');
    expect(out.endsWith("}\n")).toBe(true);
  });

  it("preserves 4-space indent and absence of final newline", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, '{\n    "hooks": {}\n}');
    installHooksIntoConfig(cfg, [entry("pkg:s", "SessionStart", "echo hi")]);
    const out = readFileSync(cfg, "utf8");
    expect(out).toContain('\n    "');
    expect(out.endsWith("}")).toBe(true);
    expect(out.endsWith("}\n")).toBe(false);
  });

  it("round-trips agent-specific extras", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, "{}\n");
    installHooksIntoConfig(cfg, [
      entry("pkg:s", "SessionStart", "echo hi", {
        additionalContextLimit: 5000,
        statusMessage: "loading",
      }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hook = (read("settings.json") as any).hooks.SessionStart[0].hooks[0];
    expect(hook.additionalContextLimit).toBe(5000);
    expect(hook.statusMessage).toBe("loading");
    expect(hook.command).toBe("echo hi");
  });

  it("preserves unrelated top-level keys", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, '{\n  "permissions": { "allow": [] },\n  "env": {}\n}\n');
    installHooksIntoConfig(cfg, [entry("pkg:s", "Stop", "echo stop")]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = read("settings.json") as any;
    expect(parsed.permissions).toEqual({ allow: [] });
    expect(parsed.env).toEqual({});
    expect(parsed.hooks.Stop).toBeDefined();
  });

  it("throws ConfigParseError on unparseable config and leaves the file untouched", () => {
    const cfg = p("settings.json");
    const bad = "{ not json";
    writeFileSync(cfg, bad);
    expect(() => installHooksIntoConfig(cfg, [entry("p:s", "Stop", "x")])).toThrow();
    expect(readFileSync(cfg, "utf8")).toBe(bad);
  });

  it("writes a .bak backup of the prior file", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, '{\n  "old": true\n}\n');
    installHooksIntoConfig(cfg, [entry("pkg:s", "Stop", "echo")]);
    expect(readFileSync(`${cfg}.hooks.bak`, "utf8")).toBe('{\n  "old": true\n}\n');
  });
});

describe("removeHooksFromConfig", () => {
  it("removes only entries matching hooksId, leaving others", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, "{}\n");
    installHooksIntoConfig(cfg, [
      entry("pkg:a", "SessionStart", "echo a"),
      entry("pkg:b", "SessionStart", "echo b"),
    ]);
    const r = removeHooksFromConfig(cfg, [{ hooksId: "pkg:a" }]);
    expect(r.removed).toEqual(["pkg:a"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hooks = (read("settings.json") as any).hooks.SessionStart[0].hooks;
    expect(hooks).toHaveLength(1);
    expect(hooks[0].hooksId).toBe("pkg:b");
  });

  it("cleans up empty groups, events, and the top-level hooks key", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, '{\n  "permissions": {}\n}\n');
    installHooksIntoConfig(cfg, [entry("pkg:s", "SessionStart", "echo hi")]);
    removeHooksFromConfig(cfg, [{ hooksId: "pkg:s" }]);
    expect(read("settings.json")).toEqual({ permissions: {} });
  });

  it("reports notFound for ids that were not present", () => {
    const cfg = p("settings.json");
    writeFileSync(cfg, "{}\n");
    installHooksIntoConfig(cfg, [entry("pkg:a", "Stop", "echo a")]);
    const r = removeHooksFromConfig(cfg, [{ hooksId: "pkg:missing" }]);
    expect(r.removed).toEqual([]);
    expect(r.notFound).toEqual(["pkg:missing"]);
  });
});
