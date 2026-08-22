import { rmSync } from "node:fs";

import { confirmInstall, printInstallResult, printSourceListing, warn } from "./ui.js";
import { parseGlobalFlags } from "./flags.js";
import { installPackage, stageSource } from "./installer.js";
import { discoverPackages } from "./discover.js";
import { reportInstall } from "./report.js";
import { isPublicRepo } from "./privacy.js";

export async function runAdd(args: string[]): Promise<void> {
  const { flags, positional } = parseGlobalFlags(args);
  const source = positional[0];
  if (!source) {
    throw new Error("add: missing <source> (a repo URL like https://github.com/owner/repo, or a local dir)");
  }

  if (flags.list) {
    await listSource(source, flags.cwd, flags.json);
    return;
  }

  if (!flags.yes) {
    const ok = await confirmInstall(`Install hooks from ${source} into ${flags.scope} config?`);
    if (!ok) {
      console.log("aborted");
      return;
    }
  }

  const outcome = await installPackage(source, {
    scope: flags.scope,
    agents: flags.agents.length > 0 ? flags.agents : undefined,
    mark: flags.mark,
    cwd: flags.cwd,
    hookFilter: flags.hook,
  });

  printInstallResult(outcome, flags.json);

  if (outcome.report) {
    const r = outcome.report;
    const pub = await isPublicRepo(r.host, r.owner, r.repo);
    if (pub) reportInstall(r);
  }

  const driftCount = Object.values(outcome.results).filter((r) =>
    r ? r.entries.some((e) => e.status === "updated") : false,
  ).length;
  if (driftCount > 0 && !flags.force) {
    warn(`${driftCount} agent(s) had drifted entries that were reset. Re-run with --force to suppress.`);
  }
}

async function listSource(source: string, cwd: string | undefined, json: boolean): Promise<void> {
  const staged = await stageSource(source, cwd);
  try {
    const discovered = discoverPackages(staged.rootDir);
    if (discovered.length === 0) {
      throw new Error(`no hooks.json found in ${source}`);
    }
    if (json) {
      console.log(JSON.stringify(discovered.map((p) => ({
        name: p.manifest.name,
        path: p.relPath,
        description: p.manifest.description,
        hooks: p.manifest.hooks.map((h) => ({ id: h.id, event: h.event })),
      }))));
      return;
    }
    if (discovered.length > 1) {
      console.log(`${discovered.length} packages — install one with --hook <name>:\n`);
    }
    printSourceListing(
      discovered.map((p) => ({
        name: p.manifest.name,
        relPath: p.relPath,
        description: p.manifest.description,
        hooks: p.manifest.hooks.map((h) => ({ id: h.id, event: h.event })),
      })),
    );
  } finally {
    if (staged.temp) rmSync(staged.temp, { recursive: true, force: true });
  }
}
