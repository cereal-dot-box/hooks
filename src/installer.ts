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
import { parseSource, type ResolvedSource } from "./source-parser.js";
import { copyScripts } from "./scripts-dir.js";
import { fetchGithubPackage } from "./github-source.js";
import { rmSync } from "node:fs";
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
  entries: Array<{ hooksId: string; status: MutationStatus }>;
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
  scriptsDirs: string[];
}

export async function installPackage(source: string, opts: InstallOptions = {}): Promise<InstallOutcome> {
  const scope = opts.scope ?? "global";
  const mark = opts.mark !== false;
  const resolved = parseSource(source, opts.cwd);
  const staged = await stageIfRemote(resolved);
  try {
    return installFromDirectory(source, resolved, staged.pkgDir, staged.sourceUrl, opts, scope, mark);
  } finally {
    if (staged.temp) rmSync(staged.temp, { recursive: true, force: true });
  }
}

async function stageIfRemote(
  resolved: ResolvedSource,
): Promise<{ pkgDir: string; sourceUrl?: string; temp?: string }> {
  if (resolved.sourceType === "local") return { pkgDir: resolved.pkgDir };
  const staged = await fetchGithubPackage(resolved);
  return { pkgDir: staged.pkgDir, sourceUrl: staged.sourceUrl, temp: staged.pkgDir };
}

function installFromDirectory(
  source: string,
  resolved: ResolvedSource,
  pkgDir: string,
  sourceUrl: string | undefined,
  opts: InstallOptions,
  scope: Scope,
  mark: boolean,
): InstallOutcome {
  const loaded = loadManifest(pkgDir);
  const { manifest, manifestHash } = loaded;

  const agents = resolveAgents(opts.agents);

  const files = manifest.files ?? [];
  const scriptsDirs = new Map<string, string>();
  for (const h of manifest.hooks) {
    if (files.length > 0) {
      scriptsDirs.set(h.id, copyScripts(h.id, files, pkgDir));
    }
  }

  const results: Partial<Record<AgentName, AgentResult>> = {};
  const configPaths: Record<string, string> = {};
  const installedEntries: InstalledEntry[] = [];

  for (const agentName of agents) {
    const adapter = getAdapter(agentName);
    const configPath = scope === "global" ? adapter.globalConfigPath() : adapter.projectConfigPath();
    configPaths[agentName] = configPath;

    const prepared: PreparedEntry[] = manifest.hooks.map((h) =>
      adapter.adaptHook(h, { packageName: manifest.name, scriptsDir: scriptsDirs.get(h.id) ?? "", pkgDir }),
    );
    const res = installHooksIntoConfig(configPath, prepared, { mark });
    results[agentName] = { configPath, entries: res.entries };

    for (let i = 0; i < manifest.hooks.length; i++) {
      const h = manifest.hooks[i]!;
      const p = prepared[i]!;
      installedEntries.push({
        hooksId: `${manifest.name}:${h.id}`,
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
    sourceUrl,
    ref: resolved.sourceType === "github" ? resolved.ref : undefined,
    resolvedAt: now,
    manifestHash,
    agents,
    configPaths,
    entries: installedEntries,
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
      ref: resolved.sourceType === "github" ? resolved.ref : undefined,
      manifestHash,
      agents,
      hooks: manifest.hooks.map((h) => ({ id: h.id, event: h.event })),
    }),
    opts.cwd,
  );

  return { packageName: manifest.name, manifestHash, agents, results, scriptsDirs: [...new Set(scriptsDirs.values())] };
}

function resolveAgents(specified?: AgentName[]): AgentName[] {
  if (specified && specified.length > 0) return specified;
  const detected = detectInstalledAgents();
  return detected.length > 0 ? detected : [...ALL_AGENT_NAMES];
}
