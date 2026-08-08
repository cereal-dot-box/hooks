#!/usr/bin/env node
import { printHelp, printVersion, errorExit } from "./ui.js";
import { runAdd } from "./add.js";
import { runRemove } from "./remove.js";
import { runList } from "./list.js";

const VERSION = "0.1.0";

async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);

  if (args.length === 0) {
    printHelp();
    return;
  }

  const cmd = args[0]!;
  const rest = args.slice(1);

  switch (cmd) {
    case "-h":
    case "--help":
    case "help":
      printHelp();
      return;
    case "-v":
    case "--version":
      printVersion(VERSION);
      return;
    case "add":
      await runAdd(rest);
      return;
    case "remove":
    case "rm":
      await runRemove(rest);
      return;
    case "list":
    case "ls":
      await runList(rest);
      return;
    default:
      errorExit(`unknown command "${cmd}" (see --help)`);
  }
}

main(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  errorExit(msg);
});
