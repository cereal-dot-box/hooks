import { existsSync, readFileSync } from "node:fs";
import { readGlobalLock } from "./installed-lock.js";
import { scriptsDirFor } from "./scripts-dir.js";
import type { AgentName } from "./types.js";

export interface ListedEntry {
  agenthooksId: string;
  event: string;
  agent: AgentName;
  status: "present" | "drifted-modified" | "drifted-missing";
}

export interface ListedPackage {
  name: string;
  source: string;
  sourceType: string;
  agents: AgentName[];
  configPaths: Record<string, string>;
  scriptsDirs: string[];
  entries: ListedEntry[];
}

export interface ListOutcome {
  packages: ListedPackage[];
}

/** Read a config and return agenthooksId -> command for every marked entry. */
function readMarkedCommands(configPath: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(configPath)) return out;
  let root: unknown;
  try {
    root = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return out;
  }
  const hooks = (root as Record<string, unknown> | null)?.hooks;
  if (!hooks || typeof hooks !== "object") return out;
  for (const groups of Object.values(hooks as Record<string, unknown>)) {
    if (!Array.isArray(groups)) continue;
    for (const g of groups) {
      if (!g || typeof g !== "object") continue;
      const gh = (g as Record<string, unknown>).hooks;
      if (!Array.isArray(gh)) continue;
      for (const e of gh) {
        if (!e || typeof e !== "object") continue;
        const eo = e as Record<string, unknown>;
        const id = eo.agenthooksId;
        if (typeof id === "string" && typeof eo.command === "string") {
          out.set(id, eo.command);
        }
      }
    }
  }
  return out;
}

export function listInstalled(): ListOutcome {
  const glock = readGlobalLock();
  const packages: ListedPackage[] = [];

  for (const [name, pkg] of Object.entries(glock.packages)) {
    const liveByAgent = new Map<AgentName, Map<string, string>>();
    for (const agentName of pkg.agents) {
      const configPath = pkg.configPaths[agentName];
      if (!configPath) continue;
      liveByAgent.set(agentName, readMarkedCommands(configPath));
    }

    const entries: ListedEntry[] = pkg.entries.map((e) => {
      const live = liveByAgent.get(e.agent);
      const liveCmd = live?.get(e.agenthooksId);
      let status: ListedEntry["status"];
      if (liveCmd === undefined) status = "drifted-missing";
      else if (liveCmd !== e.command) status = "drifted-modified";
      else status = "present";
      return { agenthooksId: e.agenthooksId, event: e.event, agent: e.agent, status };
    });

    packages.push({
      name,
      source: pkg.source,
      sourceType: pkg.sourceType,
      agents: pkg.agents,
      configPaths: pkg.configPaths,
      scriptsDirs: [...new Set(pkg.entries.map((e) => scriptsDirFor(e.hookId)))],
      entries,
    });
  }

  return { packages };
}
