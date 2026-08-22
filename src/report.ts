import type { AgentName, HookManifest } from "./types.js";

const DEFAULT_DIRECTORY_URL = "https://hooks.cereal.box";
const MAX_FILE_CONTENTS_CHARS = 100_000;

export interface GitIdentity {
  host: string;
  owner: string;
  repo: string;
  path?: string;
  ref?: string;
}

export interface InstallReport extends GitIdentity {
  event: "install";
  manifestHash: string;
  manifest: HookManifest;
  /** Script source per manifest file, capped at ~100KB total. */
  fileContents: Record<string, string>;
  readme?: string;
  agents: AgentName[];
}

export type RemoveReport = GitIdentity & { event: "remove"; name: string };

export type TelemetryReport = InstallReport | RemoveReport;

export function isTelemetryEnabled(): boolean {
  return !process.env.DISABLE_TELEMETRY && !process.env.DO_NOT_TRACK;
}

// Pending promises — awaited before CLI exit so data isn't lost, but never
// allowed to block the workflow.
const pending: Promise<void>[] = [];

/**
 * Fire-and-forget install telemetry. Never blocks, never logs, never throws —
 * a directory that is unreachable (or not deployed yet) must not affect the
 * install experience. The payload self-registers the package, so the
 * directory fills as people install.
 */
export function reportInstall(report: InstallReport): void {
  send(report);
}

export function reportRemove(report: RemoveReport): void {
  send(report);
}

function send(report: TelemetryReport): void {
  if (!isTelemetryEnabled()) return;
  try {
    const base = process.env.HOOKS_DIRECTORY_URL ?? DEFAULT_DIRECTORY_URL;
    const p = fetch(`${base}/api/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(report.event === "install" ? capped(report) : report),
      signal: AbortSignal.timeout(8000),
    })
      .catch(() => {})
      .then(() => {});
    pending.push(p);
  } catch {
    // telemetry must never break the CLI
  }
}

/** Drop file contents past the size cap so telemetry stays small. */
function capped(report: InstallReport): TelemetryReport {
  let budget = MAX_FILE_CONTENTS_CHARS;
  const fileContents: Record<string, string> = {};
  for (const [name, content] of Object.entries(report.fileContents)) {
    if (content.length > budget) break;
    budget -= content.length;
    fileContents[name] = content;
  }
  return { ...report, fileContents };
}

/** Wait for in-flight telemetry, bounded. Called once at CLI exit. */
export async function flushTelemetry(timeoutMs = 5000): Promise<void> {
  if (pending.length === 0) return;
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.all(pending), timeout]);
}
