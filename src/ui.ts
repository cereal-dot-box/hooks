import { confirm } from "@clack/prompts";
import pc from "picocolors";
import type { InstallOutcome, AgentResult } from "./installer.js";
import type { ListOutcome, ListedEntry } from "./lister.js";
import type { RemoveOutcome } from "./remover.js";

export async function confirmInstall(message: string): Promise<boolean> {
  const res = await confirm({ message, initialValue: true });
  return res === true;
}

const STATUS_COLOR: Record<string, (s: string) => string> = {
  added: pc.green,
  updated: pc.yellow,
  "already-present": pc.dim,
  present: pc.green,
  "drifted-modified": pc.yellow,
  "drifted-missing": pc.red,
};

function colorStatus(s: string): string {
  return (STATUS_COLOR[s] ?? pc.white)(s);
}

export function printInstallResult(o: InstallOutcome, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(o));
    return;
  }
  console.log(pc.bold(`Installed ${pc.cyan(o.packageName)} ${pc.dim(`(${o.manifestHash})`)}`));
  for (const d of o.scriptsDirs) console.log(pc.dim(`  scripts: ${d}`));
  for (const [agent, res] of Object.entries(o.results)) {
    const r = res as AgentResult;
    console.log(`  ${pc.magenta(agent)} ${pc.dim("→")} ${pc.dim(r.configPath)}`);
    for (const e of r.entries) {
      console.log(`    ${colorStatus(e.status.padEnd(16))} ${e.hooksId}`);
    }
  }
}

export function printList(o: ListOutcome, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(o));
    return;
  }
  if (o.packages.length === 0) {
    console.log(pc.dim("No packages installed."));
    return;
  }
  for (const pkg of o.packages) {
    console.log(`${pc.bold(pc.cyan(pkg.name))} ${pc.dim(`from ${pkg.source}`)}`);
    for (const e of pkg.entries as ListedEntry[]) {
      console.log(
        `  ${colorStatus(e.status.padEnd(18))} ${pc.magenta(e.agent)}  ${e.event}  ${pc.dim(e.hooksId)}`,
      );
    }
  }
}

export function printRemove(o: RemoveOutcome, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(o));
    return;
  }
  if (!o.wasInstalled) {
    console.log(pc.dim(`"${o.packageName}" is not installed.`));
    return;
  }
  console.log(pc.bold(`Removed ${pc.cyan(o.packageName)}`));
  console.log(pc.dim(`  ${o.removed.length} hook(s) removed`));
  if (o.notFound.length > 0) console.log(pc.dim(`  ${o.notFound.length} not found in config`));
  if (o.scriptsRemoved) console.log(pc.dim("  scripts cleaned up"));
}

export function printSourceListing(packages: Array<{ name: string; relPath?: string; description?: string; hooks: Array<{ id: string; event: string }> }>): void {
  for (const pkg of packages) {
    const loc = pkg.relPath ? pc.dim(` (${pkg.relPath})`) : "";
    const desc = pkg.description ? pc.dim(` — ${pkg.description}`) : "";
    console.log(`${pc.bold(pc.cyan(pkg.name))}${loc}${desc}`);
    for (const h of pkg.hooks) {
      console.log(`  ${pc.magenta(h.event.padEnd(18))} ${h.id}`);
    }
  }
}

export function printHelp(): void {
  console.log(`hooks — install lifecycle hooks into Claude Code + Codex

${pc.bold("Usage")}
  hooks <command> [options]

${pc.bold("Commands")}
  add <source>        Install from a git repo URL (any forge), owner/repo, or a local dir
  list                Show installed packages and drift status
  remove <name>       Remove a package and its hooks

${pc.bold("Options")}
  -g, --global        Target ~/.claude + ~/.codex (default)
  -p, --project       Target ./.claude + ./.codex (committable)
  --hook <id|name>    Install one hook of a package, or the package with that name
  -l, --list          List packages a source offers, without installing
  --agent <name>      Restrict to a specific agent (repeatable)
  --no-marker         Skip managedBy/hooksId fields
  --force             Suppress drift warnings
  -y, --yes           Non-interactive (skip confirm prompts)
  --json              Machine-readable output
  --cwd <path>        Working directory for project scope + source resolution
  -h, --help          Show this help
  -v, --version       Show version`);
}

export function printVersion(version: string): void {
  console.log(`hooks ${version}`);
}

export function warn(message: string): void {
  console.error(pc.yellow(`warn: ${message}`));
}

export function errorExit(message: string): never {
  console.error(pc.red(`hooks: ${message}`));
  process.exit(1);
}
