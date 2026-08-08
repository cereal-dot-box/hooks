import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { SCRIPTS_ROOT } from "./constants.js";

/** Sanitize a package name for use as a directory segment. */
export function sanitizePkgName(pkgName: string): string {
  return pkgName.replace(/[^a-z0-9._-]/gi, "_");
}

export function scriptsDirFor(
  pkgName: string,
  manifestHash: string,
  root: string = SCRIPTS_ROOT,
): string {
  return join(root, sanitizePkgName(pkgName), manifestHash);
}

/**
 * Copy the manifest's `files` (paths relative to srcDir) into the scripts dir,
 * preserving relative structure. Idempotent: a no-op if the dir already exists.
 */
export function copyScripts(
  pkgName: string,
  manifestHash: string,
  files: string[],
  srcDir: string,
  root: string = SCRIPTS_ROOT,
): string {
  const dest = scriptsDirFor(pkgName, manifestHash, root);
  if (existsSync(dest)) return dest;
  mkdirSync(dest, { recursive: true });
  for (const rel of files) {
    const src = join(srcDir, rel);
    if (!existsSync(src)) {
      throw new Error(`package file not found: ${rel}`);
    }
    const out = join(dest, rel);
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(src, out);
  }
  return dest;
}

/** Remove every installed version's scripts for a package. */
export function rmScriptsDir(pkgName: string, root: string = SCRIPTS_ROOT): void {
  const dir = join(root, sanitizePkgName(pkgName));
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
