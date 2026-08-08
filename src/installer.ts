import {
  ALL_AGENT_NAMES,
  detectInstalledAgents,
  getAdapter,
} from "./agents.js";
import { readGlobalLock, upsertPackage, writeGlobalLock, getPackage } from "./installed-lock.js";
import {
  readProjectLock,
  upsertProjectPackage,
  writeProjectLock,
} from "./project-lock.js";
import { loadManifest } from "./manifest.js";
import { installHooksIntoConfig } from "./merge-engine.js";
import { parseSource } from "./source-parser.js";
import { copyScripts } from "./scripts-dir.js";
import type {
  AgentName,
  InstalledEntry,
  MutationStatus,
  PackageInstall,
  PreparedEntry,
} from "./types.js";

export type Scope = "global" | "project";

export interface AgentResult {
  configPath: string;
  entries: Array<{ agenthooksId: string; status: MutationStatus }>;
}

export interface InstallOptions {
  scope?: Scope;
  agents?: AgentName[];
  mark?: boolean;
  cwd?: string;
}

export interface InstallOutcome {
  packageName: string;
  manifestHash: string;
  agents: AgentName[];
  results: Partial<Record<AgentName, AgentResult>>;
  scriptsDir: string | null;
}

export function installPackage(source: string, opts: InstallOptions = {}): InstallOutcome {
  const scope = opts.scope ?? "global";
  const mark = opts.mark !== false;
  const resolved = parseSource(source, opts.cwd);
  const loaded = loadManifest(resolved.pkgDir);
  const { manifest, manifestHash, pkgDir } = loaded;

  const agents = resolveAgents(opts.agents);

  const files = manifest.files ?? [];
  const scriptsDir = files.length > 0 ? copyScripts(manifest.name, manifestHash, files, pkgDir) : null;

  const ctx = { packageName: manifest.name, scriptsDir: scriptsDir ?? "", pkgDir };
  const results: Partial<Record<AgentName, AgentResult>> = {};
  const configPaths: Record<string, string> = {};
  const installedEntries: InstalledEntry[] = [];

  for (const agentName of agents) {
    const adapter = getAdapter(agentName);
    const configPath = scope === "global" ? adapter.globalConfigPath() : adapter.projectConfigPath();
    configPaths[agentName] = configPath;

    const prepared: PreparedEntry[] = manifest.hooks.map((h) => adapter.adaptHook(h, ctx));
    const res = installHooksIntoConfig(configPath, prepared, { mark });
    results[agentName] = { configPath, entries: res.entries };

    for (let i = 0; i < manifest.hooks.length; i++) {
      const h = manifest.hooks[i]!;
      const p = prepared[i]!;
      installedEntries.push({
        agenthooksId: `${manifest.name}:${h.id}`,
        packageName: manifest.name,
        hookId: h.id,
        event: h.event,
        agent: agentName,
        matcher: p.matcher,
        command: p.command,
      });
    }
  }

  const now = new Date().toISOString();
  const existing = getPackage(readGlobalLock(), manifest.name);
  const pkgInstall: PackageInstall = {
    name: manifest.name,
    source,
    sourceType: resolved.sourceType,
    sourceUrl: resolved.sourceUrl,
    ref: resolved.ref,
    resolvedAt: now,
    manifestHash,
    agents,
    configPaths,
    entries: installedEntries,
    scriptsDir: scriptsDir ?? undefined,
    mark,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  };
  writeGlobalLock(upsertPackage(readGlobalLock(), pkgInstall));

  writeProjectLock(
    upsertProjectPackage(readProjectLock(opts.cwd), {
      name: manifest.name,
      source,
      sourceType: resolved.sourceType,
      ref: resolved.ref,
      manifestHash,
      agents,
      hooks: manifest.hooks.map((h) => ({ id: h.id, event: h.event })),
    }),
    opts.cwd,
  );

  return { packageName: manifest.name, manifestHash, agents, results, scriptsDir };
}

function resolveAgents(specified?: AgentName[]): AgentName[] {
  if (specified && specified.length > 0) return specified;
  const detected = detectInstalledAgents();
  return detected.length > 0 ? detected : [...ALL_AGENT_NAMES];
}
