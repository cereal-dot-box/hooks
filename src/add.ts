import { confirmInstall, printInstallResult, warn } from "./ui.js";
import { parseGlobalFlags } from "./flags.js";
import { installPackage } from "./installer.js";
import { reportInstall } from "./report.js";

export async function runAdd(args: string[]): Promise<void> {
  const { flags, positional } = parseGlobalFlags(args);
  const source = positional[0];
  if (!source) throw new Error("add: missing <source> (a local dir, or github:owner/repo[@ref][#path])");

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
  });

  printInstallResult(outcome, flags.json);

  reportInstall(outcome.packageName);

  const driftCount = Object.values(outcome.results).filter((r) =>
    r ? r.entries.some((e) => e.status === "updated") : false,
  ).length;
  if (driftCount > 0 && !flags.force) {
    warn(`${driftCount} agent(s) had drifted entries that were reset. Re-run with --force to suppress.`);
  }
}
