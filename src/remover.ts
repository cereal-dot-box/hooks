import { getAdapter } from "./agents.js";
import { getPackage, readGlobalLock, removePackageEntry, writeGlobalLock } from "./installed-lock.js";
import {
  readProjectLock,
  removeProjectPackage,
  writeProjectLock,
} from "./project-lock.js";
import { removeHooksFromConfig } from "./merge-engine.js";
import { rmScriptsDir } from "./scripts-dir.js";
import type { AgentName, RemoveTarget } from "./types.js";
import type { Scope } from "./installer.js";

export interface RemoveOptions {
  scope?: Scope;
  agents?: AgentName[];
  cwd?: string;
}

export interface RemoveOutcome {
  packageName: string;
  wasInstalled: boolean;
  removed: string[];
  notFound: string[];
  scriptsRemoved: boolean;
}

export function removePackage(name: string, opts: RemoveOptions = {}): RemoveOutcome {
  const scope = opts.scope ?? "global";
  const glock = readGlobalLock();
  const pkg = getPackage(glock, name);

  if (!pkg) {
    return { packageName: name, wasInstalled: false, removed: [], notFound: [], scriptsRemoved: false };
  }

  const agents = opts.agents && opts.agents.length > 0 ? opts.agents : pkg.agents;
  const removed: string[] = [];
  const notFound: string[] = [];

  for (const agentName of agents) {
    const adapter = getAdapter(agentName);
    const configPath =
      pkg.configPaths[agentName] ??
      (scope === "global" ? adapter.globalConfigPath() : adapter.projectConfigPath());

    const entriesForAgent = pkg.entries.filter((e) => e.agent === agentName);
    const targets: RemoveTarget[] = pkg.mark
      ? entriesForAgent.map((e) => ({ agenthooksId: e.agenthooksId }))
      : entriesForAgent.map((e) => ({ event: e.event, matcher: e.matcher, command: e.command }));

    const res = removeHooksFromConfig(configPath, targets);
    removed.push(...res.removed);
    notFound.push(...res.notFound);
  }

  let scriptsRemoved = false;
  if (pkg.scriptsDir) {
    rmScriptsDir(pkg.name);
    scriptsRemoved = true;
  }

  writeGlobalLock(removePackageEntry(glock, name));
  writeProjectLock(removeProjectPackage(readProjectLock(opts.cwd), name), opts.cwd);

  return { packageName: name, wasInstalled: true, removed, notFound, scriptsRemoved };
}
