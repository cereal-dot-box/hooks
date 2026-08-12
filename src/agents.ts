import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { templateCommand } from "./templating.js";
import type { TemplateContext } from "./templating.js";
import type { AgentName, ManifestHook, PreparedEntry } from "./types.js";

export interface AdaptContext extends TemplateContext {
  packageName: string;
}

export interface AgentAdapter {
  name: AgentName;
  displayName: string;
  globalConfigPath: () => string;
  projectConfigPath: () => string;
  detectInstalled: () => boolean;
  showInUniversalList: boolean;
  /** Convert a manifest hook into a prepared entry for this agent. */
  adaptHook: (hook: ManifestHook, ctx: AdaptContext) => PreparedEntry;
}

function pickDefined(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}

const claudeHome = join(homedir(), ".claude");
const codexHome = join(homedir(), ".codex");

export const claudeCodeAdapter: AgentAdapter = {
  name: "claude-code",
  displayName: "Claude Code",
  globalConfigPath: () => join(claudeHome, "settings.json"),
  projectConfigPath: () => join(process.cwd(), ".claude", "settings.json"),
  showInUniversalList: true,
  detectInstalled: () => existsSync(claudeHome) || !!process.env.CLAUDE_CODE,
  adaptHook: (hook, ctx) => {
    const o = hook.agents?.["claude-code"];
    return {
      hooksId: `${ctx.packageName}:${hook.id}`,
      event: hook.event,
      matcher: o?.matcher ?? hook.matcher,
      command: templateCommand(o?.command ?? hook.command, ctx),
      extras: pickDefined({ timeout: hook.timeout }),
    };
  },
};

export const codexAdapter: AgentAdapter = {
  name: "codex",
  displayName: "Codex",
  globalConfigPath: () => join(codexHome, "hooks.json"),
  projectConfigPath: () => join(process.cwd(), ".codex", "hooks.json"),
  showInUniversalList: true,
  detectInstalled: () =>
    existsSync(codexHome) || existsSync(join(codexHome, "config.toml")) || !!process.env.CODEX_HOME,
  adaptHook: (hook, ctx) => {
    const o = hook.agents?.codex;
    return {
      hooksId: `${ctx.packageName}:${hook.id}`,
      event: hook.event,
      matcher: o?.matcher ?? hook.matcher,
      command: templateCommand(o?.command ?? hook.command, ctx),
      extras: pickDefined({
        additionalContextLimit: hook.additionalContextLimit,
        statusMessage: hook.statusMessage,
        timeout: hook.timeout,
      }),
    };
  },
};

export const AGENTS: Record<AgentName, AgentAdapter> = {
  "claude-code": claudeCodeAdapter,
  codex: codexAdapter,
};

export const ALL_AGENT_NAMES: AgentName[] = ["claude-code", "codex"];

export function getAdapter(name: AgentName): AgentAdapter {
  return AGENTS[name];
}

export function detectInstalledAgents(): AgentName[] {
  return ALL_AGENT_NAMES.filter((n) => AGENTS[n].detectInstalled());
}
