import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_LOCK_NAME } from "./constants.js";
import type { AgentName, ProjectLock, ProjectLockEntry } from "./types.js";

function empty(): ProjectLock {
  return { schemaVersion: 1, packages: [] };
}

export function readProjectLock(cwd: string = process.cwd()): ProjectLock {
  const path = join(cwd, PROJECT_LOCK_NAME);
  if (!existsSync(path)) return empty();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ProjectLock>;
    return { schemaVersion: 1, packages: parsed.packages ?? [] };
  } catch {
    return empty();
  }
}

function sortedCopy(lock: ProjectLock): ProjectLock {
  const packages = [...lock.packages]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      ...p,
      agents: [...p.agents].sort() as AgentName[],
      hooks: [...p.hooks].sort((a, b) => a.id.localeCompare(b.id)),
    }));
  return { schemaVersion: 1, packages };
}

export function writeProjectLock(lock: ProjectLock, cwd: string = process.cwd()): void {
  writeFileSync(join(cwd, PROJECT_LOCK_NAME), `${JSON.stringify(sortedCopy(lock), null, 2)}\n`, "utf8");
}

export function upsertProjectPackage(lock: ProjectLock, entry: ProjectLockEntry): ProjectLock {
  const packages = lock.packages.filter((p) => p.name !== entry.name);
  return { schemaVersion: 1, packages: [...packages, entry] };
}

export function removeProjectPackage(lock: ProjectLock, name: string): ProjectLock {
  return { schemaVersion: 1, packages: lock.packages.filter((p) => p.name !== name) };
}
