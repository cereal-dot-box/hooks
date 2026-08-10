/**
 * Core lifecycle: the 5 linear events that bracket an agent run, in the
 * order they fire. These form the rail.
 */
export const PRIMARY_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Stop',
] as const

/**
 * Secondary events: agent-emitted side signals that don't sit on the linear
 * rail. Listed under the rail in the lifecycle sidebar.
 */
export const SECONDARY_EVENTS = [
  'Notification',
  'SubagentStop',
  'SessionEnd',
] as const

/** Off-spine annotation: PreCompact fires non-linearly. */
export const OFF_SPINE_EVENTS = ['PreCompact'] as const

/** All hookable events — primary + secondary + off-spine. */
export const HOOK_EVENTS = [...PRIMARY_EVENTS, ...SECONDARY_EVENTS] as const

export type EventId =
  | (typeof PRIMARY_EVENTS)[number]
  | (typeof SECONDARY_EVENTS)[number]
  | (typeof OFF_SPINE_EVENTS)[number]

export const PRIMARY_EVENT_IDS: readonly EventId[] = PRIMARY_EVENTS
export const SECONDARY_EVENT_IDS: readonly EventId[] = SECONDARY_EVENTS
export const ALL_EVENTS: readonly EventId[] = [
  ...HOOK_EVENTS,
  ...OFF_SPINE_EVENTS,
]

export const EVENT_INFO: Record<
  EventId,
  { label: string; fires: string }
> = {
  SessionStart: {
    label: 'SessionStart',
    fires: 'Session begins, resumes, or clears.',
  },
  UserPromptSubmit: {
    label: 'UserPromptSubmit',
    fires: 'User submits a prompt.',
  },
  PreToolUse: {
    label: 'PreToolUse',
    fires: 'Before each tool call.',
  },
  PostToolUse: {
    label: 'PostToolUse',
    fires: 'After each tool call.',
  },
  Notification: {
    label: 'Notification',
    fires: 'Agent emits a notification.',
  },
  SubagentStop: {
    label: 'SubagentStop',
    fires: 'A subagent finishes its task.',
  },
  Stop: {
    label: 'Stop',
    fires: 'Agent stops, returns control.',
  },
  SessionEnd: {
    label: 'SessionEnd',
    fires: 'Session ends.',
  },
  PreCompact: {
    label: 'PreCompact',
    fires: 'Before context compaction. Fires non-linearly, so it sits off the timeline.',
  },
}

export function isEventId(value: string): value is EventId {
  return (ALL_EVENTS as readonly string[]).includes(value)
}
