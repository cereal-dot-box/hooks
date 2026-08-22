import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

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
import { cloneSource } from "./git-source.js";
import { discoverPackages, selectPackage, type DiscoveredPackage, type Selection } from "./discover.js";
import type { InstallReport } from "./report.js";
import type {
  AgentName,
  InstalledEntry,
  ManifestHook,
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
  /** `--hook X`: pick hook id X within a package, or the package named X. */
  hookFilter?: string;
}

export interface InstallOutcome {
  packageName: string;
  manifestHash: string;
  agents: AgentName[];
  results: Partial<Record<AgentName, AgentResult>>;
  scriptsDirs: string[];
  /** Present for git sources — self-registers the package in the directory. */
  report?: InstallReport;
}

export interface StagedSource {
  resolved: ResolvedSource;
  /** Repo root (git) or package dir (local). */
  rootDir: string;
  sourceUrl?: string;
  /** Temp dir to clean up; set for git sources. */
  temp?: string;
}

export async function stageSource(source: string, cwd?: string): Promise<StagedSource> {
  const resolved = parseSource(source, cwd);
  if (resolved.sourceType === "local") return { resolved, rootDir: resolved.pkgDir };
  const staged = await cloneSource(resolved);
  return { resolved, rootDir: staged.rootDir, sourceUrl: staged.sourceUrl, temp: staged.tempDir };
}

export async function installPackage(source: string, opts: InstallOptions = {}): Promise<InstallOutcome> {
  const scope = opts.scope ?? "global";
  const mark = opts.mark !== false;
  const staged = await stageSource(source, opts.cwd);
  try {
    const discovered = discoverPackages(staged.rootDir);
    if (discovered.length === 0) {
      throw new Error(`no hooks.json found in ${source}`);
    }
    const subPath = staged.resolved.sourceType === "git" ? staged.resolved.subPath : undefined;
    const selection = selectPackage(discovered, { subPath, hookFilter: opts.hookFilter });
    return installFromDirectory(source, staged, selection, opts, scope, mark);
  } finally {
    if (staged.temp) rmSync(staged.temp, { recursive: true, force: true });
  }
}

function installFromDirectory(
  source: string,
  staged: StagedSource,
  selection: Selection,
  opts: InstallOptions,
  scope: Scope,
  mark: boolean,
): InstallOutcome {
  const { resolved } = staged;
  const pkgDir = selection.pkg.dir;
  const { manifest, manifestHash } = loadManifest(pkgDir);

  const agents = resolveAgents(opts.agents);
  const hooks = selection.hookIds
    ? manifest.hooks.filter((h) => selection.hookIds!.includes(h.id))
    : manifest.hooks;

  const files = manifest.files ?? [];
  const scriptsDirs = new Map<string, string>();
  for (const h of hooks) {
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

    const prepared: PreparedEntry[] = hooks.map((h) =>
      adapter.adaptHook(h, { packageName: manifest.name, scriptsDir: scriptsDirs.get(h.id) ?? "", pkgDir }),
    );
    const res = installHooksIntoConfig(configPath, prepared, { mark });
    results[agentName] = { configPath, entries: res.entries };

    for (let i = 0; i < hooks.length; i++) {
      const h = hooks[i]!;
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
    source: source,
    sourceType: resolved.sourceType,
    sourceUrl: staged.sourceUrl,
    git:
      resolved.sourceType === "git"
        ? {
            host: resolved.host,
            owner: resolved.owner,
            repo: resolved.repo,
            path: selection.pkg.relPath,
            ref: resolved.ref,
          }
        : undefined,
    ref: resolved.sourceType === "git" ? resolved.ref : undefined,
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
      source: source,
      sourceType: resolved.sourceType,
      ref: resolved.sourceType === "git" ? resolved.ref : undefined,
      manifestHash,
      agents,
      hooks: hooks.map((h) => ({ id: h.id, event: h.event })),
    }),
    opts.cwd,
  );

  const report =
    resolved.sourceType === "git"
      ? buildInstallReport(resolved, selection.pkg, manifest, manifestHash, agents)
      : undefined;

  return {
    packageName: manifest.name,
    manifestHash,
    agents,
    results,
    scriptsDirs: [...new Set(scriptsDirs.values())],
    report,
  };
}

function buildInstallReport(
  resolved: Extract<ResolvedSource, { sourceType: "git" }>,
  pkg: DiscoveredPackage,
  manifest: { name: string; description?: string; files?: string[]; hooks: ManifestHook[] },
  manifestHash: string,
  agents: AgentName[],
): InstallReport {
  const fileContents: Record<string, string> = {};
  for (const rel of manifest.files ?? []) {
    const abs = join(pkg.dir, rel);
    if (existsSync(abs)) {
      try {
        fileContents[rel] = readFileSync(abs, "utf8");
      } catch {
        // missing file content just isn't uploaded
      }
    }
  }

  const readme = findReadme(pkg.dir);

  return {
    event: "install",
    host: resolved.host,
    owner: resolved.owner,
    repo: resolved.repo,
    path: pkg.relPath,
    ref: resolved.ref,
    manifestHash,
    manifest: {
      name: manifest.name,
      description: manifest.description,
      files: manifest.files,
      hooks: manifest.hooks,
    },
    fileContents,
    readme,
    agents,
  };
}

function findReadme(pkgDir: string): string | undefined {
  for (const name of ["README.md", "readme.md", "README.markdown", "README.mdown"]) {
    const abs = join(pkgDir, name);
    if (existsSync(abs)) {
      try {
        return readFileSync(abs, "utf8");
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function resolveAgents(specified?: AgentName[]): AgentName[] {
  if (specified && specified.length > 0) return specified;
  const detected = detectInstalledAgents();
  return detected.length > 0 ? detected : [...ALL_AGENT_NAMES];
}
