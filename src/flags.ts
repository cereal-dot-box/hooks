import type { AgentName } from "./types.js";

export interface GlobalFlags {
  scope: "global" | "project";
  mark: boolean;
  force: boolean;
  yes: boolean;
  agents: AgentName[];
  cwd?: string;
  json: boolean;
}

export interface ParsedArgs {
  flags: GlobalFlags;
  positional: string[];
}

function parseAgentName(s: string): AgentName {
  if (s === "claude-code" || s === "codex") return s;
  throw new Error(`unknown agent "${s}" (supported: claude-code, codex)`);
}

export function parseGlobalFlags(args: string[]): ParsedArgs {
  const flags: GlobalFlags = {
    scope: "global",
    mark: true,
    force: false,
    yes: false,
    agents: [],
    json: false,
  };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    switch (a) {
      case "-g":
      case "--global":
        flags.scope = "global";
        break;
      case "-p":
      case "--project":
        flags.scope = "project";
        break;
      case "--no-marker":
        flags.mark = false;
        break;
      case "--force":
        flags.force = true;
        break;
      case "-y":
      case "--yes":
        flags.yes = true;
        break;
      case "--json":
        flags.json = true;
        break;
      case "--agent": {
        const v = args[++i];
        if (v) flags.agents.push(parseAgentName(v));
        break;
      }
      case "--cwd":
        flags.cwd = args[++i];
        break;
      default:
        if (a.startsWith("--agent=")) {
          flags.agents.push(parseAgentName(a.slice(8)));
        } else if (a.startsWith("--cwd=")) {
          flags.cwd = a.slice(6);
        } else {
          positional.push(a);
        }
    }
  }

  return { flags, positional };
}
