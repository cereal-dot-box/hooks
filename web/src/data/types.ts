import type { EventId } from '#/lib/events'

export type AgentName = 'claude-code' | 'codex'

export type Hook = {
  id: string
  event: EventId
  /** Regex filter for the event — tool name, session source, etc. Omit = match all. */
  matcher?: string
  /** Shell command, verbatim. May contain `$HOOK_DIR`. */
  command: string
  /** Agents this hook applies to. Omit = both claude-code and codex. */
  agents?: AgentName[]
  /** Per-agent override, mirroring the manifest's `agents.<name>` block. */
  agentOverrides?: Partial<
    Record<AgentName, { command?: string; matcher?: string }>
  >
  /** Codex-only field, surfaced for transparency. */
  additionalContextLimit?: number
}

export type Package = {
  id: string
  owner: string
  repo: string
  /** Path within the repo, defaulting to root. */
  path?: string
  name: string
  description: string
  /** Short README in markdown. */
  readmeMd: string
  /** Files the manifest copies into `$HOOK_DIR`. */
  files?: string[]
  /**
   * Source text per file, keyed by filename. Populated by the upload that
   * happens during `@cerealbox/hooks add` — the directory stores whatever
   * the installer pushed, so viewers don't have to round-trip to GitHub.
   */
  fileContents?: Record<string, string>
  hooks: Hook[]
  installCountAllTime: number
  installCountTrending: number
  installCountHot: number
  /** ISO date of the most recent sync. */
  updatedAt: string
}

export type LeaderboardSort = 'all-time' | 'trending' | 'hot'

export type AgentInfo = {
  name: AgentName
  label: string
  description: string
}
