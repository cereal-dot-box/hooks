import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { HOOKS_ROOT } from "./constants.js";

/** Sanitize a hook id for use as a directory segment. */
export function sanitizeHookId(hookId: string): string {
  return hookId.replace(/[^a-z0-9._-]/gi, "_");
}

export function scriptsDirFor(hookId: string, root: string = HOOKS_ROOT): string {
  return join(root, sanitizeHookId(hookId));
}

/**
 * Copy the manifest's `files` (paths relative to srcDir) into the hook's dir,
 * preserving relative structure. Overwrites on re-install so updates propagate.
 * Each hook in a package gets its own dir keyed by hook id.
 */
export function copyScripts(
  hookId: string,
  files: string[],
  srcDir: string,
  root: string = HOOKS_ROOT,
): string {
  const dest = scriptsDirFor(hookId, root);
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

/** Remove a single hook's scripts dir. */
export function rmScriptsDir(hookId: string, root: string = HOOKS_ROOT): void {
  const dir = scriptsDirFor(hookId, root);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
