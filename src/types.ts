export type HookEvent =
  | "SessionStart"
  | "SessionEnd"
  | "PreToolUse"
  | "PostToolUse"
  | "UserPromptSubmit"
  | "Stop"
  | "Notification"
  | "SubagentStop"
  | "PreCompact";

export type AgentName = "claude-code" | "codex";

export const MANAGED_BY = "agenthooks";

/** A hook resolved for a specific agent, ready to merge into its config. */
export interface PreparedEntry {
  /** "<packageName>:<hookId>" — stable removal key. */
  agenthooksId: string;
  event: HookEvent;
  /** Group-level matcher. undefined means the catch-all group. */
  matcher?: string;
  command: string;
  /** Agent-specific fields (e.g. Codex additionalContextLimit), never including markers. */
  extras: Record<string, unknown>;
}

export type MutationStatus = "added" | "already-present" | "updated";

export interface EntryMutation {
  agenthooksId: string;
  status: MutationStatus;
}

export interface MutationResult {
  configPath: string;
  changed: boolean;
  entries: EntryMutation[];
  /** Raw text written (or the would-be output if unchanged). */
  output: string;
  /** Raw text read from disk. */
  input: string;
}

/** A target for removal — discriminated by which identification mode we're in. */
export type RemoveTarget =
  | { agenthooksId: string }
  | { event: HookEvent; matcher?: string; command: string };

export interface RemoveResult extends MutationResult {
  removed: string[];
  notFound: string[];
}

// --- Hook package manifest ---

export interface ManifestHook {
  /** Stable, unique within package, [a-z0-9-]+. */
  id: string;
  event: HookEvent;
  /** Supports $HOOK_DIR / ${HOOK_DIR} templating. */
  command: string;
  matcher?: string;
  agents?: Partial<Record<AgentName, { command?: string; matcher?: string }>>;
  /** Codex-only. */
  additionalContextLimit?: number;
  /** Codex-only. */
  statusMessage?: string;
  timeout?: number;
}

export interface HookManifest {
  name: string;
  description?: string;
  version?: 1;
  files?: string[];
  hooks: ManifestHook[];
}

// --- Lock files ---

export interface InstalledEntry {
  agenthooksId: string;
  packageName: string;
  hookId: string;
  event: HookEvent;
  agent: AgentName;
  matcher?: string;
  command: string;
}

export interface PackageInstall {
  name: string;
  source: string;
  sourceType: "local" | "github" | "npm";
  sourceUrl?: string;
  ref?: string;
  resolvedAt: string;
  manifestHash: string;
  agents: AgentName[];
  configPaths: Record<string, string>;
  entries: InstalledEntry[];
  scriptsDir?: string;
  /** Whether marker fields were written (controls removal target shape). */
  mark: boolean;
  installedAt: string;
  updatedAt: string;
}

export interface GlobalLock {
  schemaVersion: 3;
  packages: Record<string, PackageInstall>;
}

export interface ProjectLockEntry {
  name: string;
  source: string;
  sourceType: string;
  ref?: string;
  manifestHash: string;
  agents: AgentName[];
  hooks: Array<{ id: string; event: HookEvent }>;
}

export interface ProjectLock {
  schemaVersion: 1;
  packages: ProjectLockEntry[];
}
