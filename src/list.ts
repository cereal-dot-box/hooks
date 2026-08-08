import { printList } from "./ui.js";
import { parseGlobalFlags } from "./flags.js";
import { listInstalled } from "./lister.js";

export async function runList(args: string[]): Promise<void> {
  const { flags } = parseGlobalFlags(args);
  const outcome = listInstalled();
  printList(outcome, flags.json);
}
