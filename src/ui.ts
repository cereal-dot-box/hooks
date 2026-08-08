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
  if (o.scriptsDir) console.log(pc.dim(`  scripts: ${o.scriptsDir}`));
  for (const [agent, res] of Object.entries(o.results)) {
    const r = res as AgentResult;
    console.log(`  ${pc.magenta(agent)} ${pc.dim("→")} ${pc.dim(r.configPath)}`);
    for (const e of r.entries) {
      console.log(`    ${colorStatus(e.status.padEnd(16))} ${e.agenthooksId}`);
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
        `  ${colorStatus(e.status.padEnd(18))} ${pc.magenta(e.agent)}  ${e.event}  ${pc.dim(e.agenthooksId)}`,
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

export function printHelp(): void {
  console.log(`agenthooks — install lifecycle hooks into Claude Code + Codex

${pc.bold("Usage")}
  agenthooks <command> [options]

${pc.bold("Commands")}
  add <source>        Install hooks from a local package directory
  list                Show installed packages and drift status
  remove <name>       Remove a package and its hooks

${pc.bold("Options")}
  -g, --global        Target ~/.claude + ~/.codex (default)
  -p, --project       Target ./.claude + ./.codex (committable)
  --agent <name>      Restrict to a specific agent (repeatable)
  --no-marker         Skip managedBy/agenthooksId fields
  --force             Suppress drift warnings
  -y, --yes           Non-interactive (skip confirm prompts)
  --json              Machine-readable output
  --cwd <path>        Working directory for project scope + source resolution
  -h, --help          Show this help
  -v, --version       Show version`);
}

export function printVersion(version: string): void {
  console.log(`agenthooks ${version}`);
}

export function warn(message: string): void {
  console.error(pc.yellow(`warn: ${message}`));
}

export function errorExit(message: string): never {
  console.error(pc.red(`agenthooks: ${message}`));
  process.exit(1);
}
