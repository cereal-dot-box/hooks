import { describe, expect, it } from "vitest";
import { claudeCodeAdapter, codexAdapter } from "../src/agents.js";
import type { AdaptContext } from "../src/agents.js";
import type { ManifestHook } from "../src/types.js";

const ctx: AdaptContext = { packageName: "pkg", scriptsDir: "/srv/scripts", pkgDir: "/srv/pkg" };

const hook = (overrides: Partial<ManifestHook> = {}): ManifestHook => ({
  id: "h1",
  event: "SessionStart",
  command: "node $HOOK_DIR/x.mjs",
  ...overrides,
});

describe("claudeCodeAdapter.adaptHook", () => {
  it("drops Codex-only fields", () => {
    const e = claudeCodeAdapter.adaptHook(
      hook({ additionalContextLimit: 5000, statusMessage: "x" }),
      ctx,
    );
    expect(e.extras).toEqual({});
  });

  it("keeps timeout", () => {
    const e = claudeCodeAdapter.adaptHook(hook({ timeout: 30 }), ctx);
    expect(e.extras).toEqual({ timeout: 30 });
  });

  it("templates the command", () => {
    expect(claudeCodeAdapter.adaptHook(hook(), ctx).command).toBe(
      "HOOK_DIR='/srv/scripts' node '/srv/scripts/x.mjs'",
    );
  });

  it("sets agenthooksId as packageName:hookId", () => {
    expect(claudeCodeAdapter.adaptHook(hook(), ctx).agenthooksId).toBe("pkg:h1");
  });

  it("applies agents.claude-code overrides", () => {
    const e = claudeCodeAdapter.adaptHook(
      hook({ agents: { "claude-code": { matcher: "Bash" } } }),
      ctx,
    );
    expect(e.matcher).toBe("Bash");
  });
});

describe("codexAdapter.adaptHook", () => {
  it("keeps Codex extras", () => {
    const e = codexAdapter.adaptHook(
      hook({ additionalContextLimit: 5000, statusMessage: "loading" }),
      ctx,
    );
    expect(e.extras).toEqual({ additionalContextLimit: 5000, statusMessage: "loading" });
  });

  it("applies agents.codex overrides", () => {
    const e = codexAdapter.adaptHook(
      hook({ matcher: ".*", agents: { codex: { matcher: "startup|resume" } } }),
      ctx,
    );
    expect(e.matcher).toBe("startup|resume");
  });

  it("falls back to base matcher when no codex override", () => {
    expect(codexAdapter.adaptHook(hook({ matcher: "Bash" }), ctx).matcher).toBe("Bash");
  });

  it("templates the command", () => {
    expect(codexAdapter.adaptHook(hook(), ctx).command).toBe(
      "HOOK_DIR='/srv/scripts' node '/srv/scripts/x.mjs'",
    );
  });
});
