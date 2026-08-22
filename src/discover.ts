import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { MANIFEST_FILENAME } from "./constants.js";
import type { HookManifest } from "./types.js";

const SKIP_DIRS = new Set([".git", "node_modules", ".hooks"]);

export interface DiscoveredPackage {
  /** Absolute directory holding a hooks.json. */
  dir: string;
  /** Path relative to the scan root; undefined for the root itself. */
  relPath?: string;
  manifest: HookManifest;
}

/**
 * Scan a repo clone (or any directory tree) for packages: every directory
 * holding a valid-enough hooks.json. Root package sorts first. Manifests
 * that fail to parse or lack a name/hooks are skipped silently — full
 * validation happens at install time with proper error reporting.
 */
export function discoverPackages(root: string): DiscoveredPackage[] {
  const found: DiscoveredPackage[] = [];

  const visit = (dir: string, rel: string | undefined) => {
    const manifestPath = join(dir, MANIFEST_FILENAME);
    if (existsSync(manifestPath) && statSync(manifestPath).isFile()) {
      const manifest = quickParse(manifestPath);
      if (manifest) found.push(rel ? { dir, relPath: rel, manifest } : { dir, manifest });
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      visit(join(dir, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
    }
  };
  visit(root, undefined);

  return found;
}

function quickParse(manifestPath: string): HookManifest | null {
  try {
    const m = JSON.parse(readFileSync(manifestPath, "utf8")) as HookManifest;
    if (typeof m.name !== "string" || !Array.isArray(m.hooks)) return null;
    return m;
  } catch {
    return null;
  }
}

export interface Selection {
  pkg: DiscoveredPackage;
  /** Hook ids to install; undefined = all in the manifest. */
  hookIds?: string[];
}

/**
 * Pick the package (and optional hook subset) a source resolves to.
 *
 * - explicit subPath: that directory must hold a manifest
 * - hookFilter: a manifest hook with that id (filter to it), else a package
 *   named hookFilter (whole package)
 * - otherwise: the root package, or the single package found; multiple is
 *   an error listing the options
 */
export function selectPackage(
  discovered: DiscoveredPackage[],
  opts: { subPath?: string; hookFilter?: string },
): Selection {
  let candidates = discovered;

  if (opts.subPath) {
    candidates = discovered.filter((p) => p.relPath === opts.subPath);
    if (candidates.length === 0) {
      throw new Error(`no ${MANIFEST_FILENAME} at "${opts.subPath}" in this repo`);
    }
  }

  if (opts.hookFilter) {
    const want = opts.hookFilter;
    const byHook = candidates.find((p) => p.manifest.hooks.some((h) => h.id === want));
    if (byHook) return { pkg: byHook, hookIds: [want] };

    const byName = candidates.find((p) => p.manifest.name === want);
    if (byName) return { pkg: byName };

    throw new Error(
      `no hook or package named "${want}" found.\n${describePackages(candidates)}`,
    );
  }

  const root = candidates.find((p) => p.relPath === undefined);
  if (root) return { pkg: root };

  if (candidates.length === 1) return { pkg: candidates[0]! };

  throw new Error(
    `repo holds multiple packages — pick one with --hook <name>:\n${describePackages(candidates)}`,
  );
}

export function describePackages(packages: DiscoveredPackage[]): string {
  return packages
    .map((p) => {
      const loc = p.relPath ? ` (${p.relPath})` : "";
      const hooks = p.manifest.hooks.map((h) => h.id).join(", ");
      return `  ${p.manifest.name}${loc} — hooks: ${hooks}`;
    })
    .join("\n");
}
