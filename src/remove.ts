import { select } from "@clack/prompts";
import { confirmInstall, printRemove } from "./ui.js";
import { parseGlobalFlags } from "./flags.js";
import { removePackage } from "./remover.js";
import { listInstalled } from "./lister.js";

export async function runRemove(args: string[]): Promise<void> {
  const { flags, positional } = parseGlobalFlags(args);
  let name = positional[0];

  if (!name) {
    const installed = listInstalled().packages;
    if (installed.length === 0) {
      console.log("No packages installed.");
      return;
    }
    if (flags.yes) {
      console.log("remove: missing <name> (and --yes set, cannot prompt)");
      return;
    }
    const choice = await select({
      message: "Remove which package?",
      options: installed.map((p) => ({ value: p.name, label: p.name })),
    });
    if (typeof choice !== "string") {
      console.log("aborted");
      return;
    }
    name = choice;
  }

  if (!flags.yes) {
    const ok = await confirmInstall(`Remove ${name} and its hooks from ${flags.scope} config?`);
    if (!ok) {
      console.log("aborted");
      return;
    }
  }

  const outcome = removePackage(name, {
    scope: flags.scope,
    agents: flags.agents.length > 0 ? flags.agents : undefined,
    cwd: flags.cwd,
  });

  printRemove(outcome, flags.json);
}
