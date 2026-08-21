import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..");
const BIN = join(REPO_ROOT, "bin/cli.mjs");
const FIXTURE = join(REPO_ROOT, "test/fixtures/example-pkg");

let home: string;

function run(args: string[], envHome: string, extraEnv: Record<string, string> = {}): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync(process.execPath, [BIN, ...args], {
    env: { ...process.env, HOME: envHome, HOOKS_HOME: join(envHome, ".hooks"), ...extraEnv },
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

/** Async variant — the parent event loop stays alive so a stub HTTP server
 *  in this process can answer the child's fetches (spawnSync would deadlock). */
function runAsync(args: string[], envHome: string, extraEnv: Record<string, string> = {}): Promise<{ stdout: string; stderr: string; status: number | null }> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      env: { ...process.env, HOME: envHome, HOOKS_HOME: join(envHome, ".hooks"), ...extraEnv },
      cwd: REPO_ROOT,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", rejectP);
    child.on("close", (status) => resolveP({ stdout, stderr, status }));
  });
}

function readJSON(p: string): unknown {
  return JSON.parse(readFileSync(p, "utf8"));
}

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "ah-e2e-"));
});
afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

function seedUserStopHook(envHome: string): void {
  const claudeDir = join(envHome, ".claude");
  if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "echo user-stop" }] }],
    },
  };
  writeFileSync(join(claudeDir, "settings.json"), JSON.stringify(settings, null, 2) + "\n");
}

describe("end-to-end", () => {
  it("installs into empty configs, then re-add is byte-identical", () => {
    const out1 = run(["add", FIXTURE, "--global", "--yes", "--json"], home);
    expect(out1.status).toBe(0);
    const j1 = JSON.parse(out1.stdout);
    expect(j1.packageName).toBe("example-pkg");
    for (const agent of ["claude-code", "codex"] as const) {
      const entries = j1.results[agent].entries.map((e: { status: string }) => e.status);
      expect(entries).toEqual(["added", "added", "added"]);
    }

    const claudePath = join(home, ".claude/settings.json");
    const codexPath = join(home, ".codex/hooks.json");
    const beforeClaude = readFileSync(claudePath, "utf8");
    const beforeCodex = readFileSync(codexPath, "utf8");

    const out2 = run(["add", FIXTURE, "--global", "--yes", "--json"], home);
    expect(out2.status).toBe(0);
    const j2 = JSON.parse(out2.stdout);
    for (const agent of ["claude-code", "codex"] as const) {
      const entries = j2.results[agent].entries.map((e: { status: string }) => e.status);
      expect(entries).toEqual(["already-present", "already-present", "already-present"]);
    }

    expect(readFileSync(claudePath, "utf8")).toBe(beforeClaude);
    expect(readFileSync(codexPath, "utf8")).toBe(beforeCodex);
  });

  it("adapts hooks per-agent (codex extras + matcher; claude drops them)", () => {
    const claude = readJSON(join(home, ".claude/settings.json")) as any;
    const codex = readJSON(join(home, ".codex/hooks.json")) as any;

    const claudeLogBash = claude.hooks.PreToolUse[0].hooks[0];
    expect(claudeLogBash.additionalContextLimit).toBeUndefined();
    expect(claudeLogBash.statusMessage).toBeUndefined();

    const codexLogBash = codex.hooks.PreToolUse[0].hooks[0];
    expect(codexLogBash.additionalContextLimit).toBe(5000);
    expect(codexLogBash.statusMessage).toBe("Logging bash call");

    const codexSession = codex.hooks.SessionStart[0];
    expect(codexSession.matcher).toBe("startup|resume");

    const claudeSession = claude.hooks.SessionStart[0];
    expect(claudeSession.matcher).toBeUndefined();
  });

  it("leaves a user-authored Stop hook untouched", () => {
    const fresh = mkdtempSync(join(tmpdir(), "ah-e2e-user-"));
    try {
      seedUserStopHook(fresh);
      run(["add", FIXTURE, "--global", "--yes"], fresh);
      const cfg = readJSON(join(fresh, ".claude/settings.json")) as any;
      const stopGroups = cfg.hooks.Stop;
      const userEntry = stopGroups.find((g: any) =>
        g.hooks.some((h: any) => h.command === "echo user-stop"),
      );
      expect(userEntry).toBeDefined();
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  it("detects drift on list, resets on re-add", () => {
    const fresh = mkdtempSync(join(tmpdir(), "ah-e2e-drift-"));
    try {
      run(["add", FIXTURE, "--global", "--yes"], fresh);
      const p = join(fresh, ".claude/settings.json");
      const cfg = JSON.parse(readFileSync(p, "utf8")) as any;
      cfg.hooks.Stop[0].hooks[0].command = "echo tampered";
      writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n");

      const listOut = run(["list", "--json"], fresh);
      const listed = JSON.parse(listOut.stdout);
      const stopEntry = listed.packages[0].entries.find(
        (e: any) => e.hooksId === "example-pkg:say-stopped" && e.agent === "claude-code",
      );
      expect(stopEntry.status).toBe("drifted-modified");

      const reAdd = run(["add", FIXTURE, "--global", "--yes", "--force"], fresh);
      expect(reAdd.status).toBe(0);
      expect(reAdd.stderr).toBe("");
      const after = JSON.parse(readFileSync(p, "utf8")) as any;
      expect(after.hooks.Stop[0].hooks[0].command).toBe("echo stopped");
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  it("removes everything: configs back to {}, scripts gone, lock empty", () => {
    const fresh = mkdtempSync(join(tmpdir(), "ah-e2e-rm-"));
    try {
      run(["add", FIXTURE, "--global", "--yes"], fresh);
      const hooksRoot = join(fresh, ".hooks/hooks");
      expect(existsSync(join(hooksRoot, "print-session-banner"))).toBe(true);
      expect(existsSync(join(hooksRoot, "log-bash-calls"))).toBe(true);
      expect(existsSync(join(hooksRoot, "say-stopped"))).toBe(true);

      const out = run(["remove", "example-pkg", "--global", "--yes", "--json"], fresh);
      expect(out.status).toBe(0);
      const j = JSON.parse(out.stdout);
      expect(j.wasInstalled).toBe(true);
      expect(j.removed.length).toBe(6);
      expect(j.scriptsRemoved).toBe(true);

      expect(readJSON(join(fresh, ".claude/settings.json"))).toEqual({});
      expect(readJSON(join(fresh, ".codex/hooks.json"))).toEqual({});
      expect(existsSync(join(hooksRoot, "print-session-banner"))).toBe(false);
      expect(existsSync(join(hooksRoot, "log-bash-calls"))).toBe(false);
      expect(existsSync(join(hooksRoot, "say-stopped"))).toBe(false);

      const lock = readJSON(join(fresh, ".hooks/hooks.json")) as any;
      expect(lock.packages).toEqual({});
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  it("installs from a github source and records provenance in the lock", async () => {
    const manifest = {
      name: "gh-pkg",
      hooks: [{ id: "hello", event: "SessionStart", command: "node $HOOK_DIR/hello.mjs" }],
      files: ["hello.mjs"],
    };
    const srv: Server = createServer((req, res) => {
      if (req.url === "/acme/hooks/HEAD/hooks.json") {
        res.end(JSON.stringify(manifest));
      } else if (req.url === "/acme/hooks/HEAD/hello.mjs") {
        res.end("console.log('hello from github')");
      } else {
        res.statusCode = 404;
        res.end("not found");
      }
    });
    const base = await new Promise<string>((r) =>
      srv.listen(0, "127.0.0.1", () => {
        const a = srv.address() as { port: number };
        r(`http://127.0.0.1:${a.port}`);
      }),
    );

    const fresh = mkdtempSync(join(tmpdir(), "ah-e2e-gh-"));
    try {
      const out = await runAsync(["add", "github:acme/hooks", "--global", "--yes", "--json"], fresh, {
        HOOKS_GH_RAW_URL: base,
        HOOKS_DIRECTORY_URL: base, // telemetry also hits the stub; 404s are swallowed
      });
      expect(out.stderr).toBe("");
      expect(out.status).toBe(0);

      const lock = readJSON(join(fresh, ".hooks/hooks.json")) as any;
      const rec = lock.packages["gh-pkg"];
      expect(rec.sourceType).toBe("github");
      expect(rec.source).toBe("github:acme/hooks");
      expect(rec.sourceUrl).toBe("https://github.com/acme/hooks");

      const script = join(fresh, ".hooks/hooks/hello/hello.mjs");
      expect(readFileSync(script, "utf8")).toBe("console.log('hello from github')");

      const rm = await runAsync(["remove", "gh-pkg", "--global", "--yes"], fresh, { HOOKS_GH_RAW_URL: base });
      expect(rm.status).toBe(0);
      expect(existsSync(script)).toBe(false);
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});
