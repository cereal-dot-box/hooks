import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { GLOBAL_LOCK_PATH } from "./constants.js";
import { ConfigParseError } from "./errors.js";
import type { GlobalLock, PackageInstall } from "./types.js";

export function emptyGlobalLock(): GlobalLock {
  return { schemaVersion: 4, packages: {} };
}

export function readGlobalLock(path: string = GLOBAL_LOCK_PATH): GlobalLock {
  if (!existsSync(path)) return emptyGlobalLock();
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new ConfigParseError(path, e);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return emptyGlobalLock();
  }
  const obj = parsed as Partial<GlobalLock>;
  return { schemaVersion: 4, packages: obj.packages ?? {} };
}

export function writeGlobalLock(lock: GlobalLock, path: string = GLOBAL_LOCK_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export function upsertPackage(lock: GlobalLock, pkg: PackageInstall): GlobalLock {
  return {
    schemaVersion: lock.schemaVersion,
    packages: { ...lock.packages, [pkg.name]: pkg },
  };
}

export function removePackageEntry(lock: GlobalLock, name: string): GlobalLock {
  if (!(name in lock.packages)) return lock;
  const next = { ...lock.packages };
  delete next[name];
  return { schemaVersion: lock.schemaVersion, packages: next };
}

export function getPackage(lock: GlobalLock, name: string): PackageInstall | undefined {
  return lock.packages[name];
}
