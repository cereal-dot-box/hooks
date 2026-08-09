export const HOOK_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'SubagentStop',
  'Stop',
  'SessionEnd',
] as const

export const OFF_SPINE_EVENTS = ['PreCompact'] as const

export type EventId =
  | (typeof HOOK_EVENTS)[number]
  | (typeof OFF_SPINE_EVENTS)[number]

export const ALL_EVENTS: readonly EventId[] = [...HOOK_EVENTS, ...OFF_SPINE_EVENTS]

export const EVENT_INFO: Record<
  EventId,
  { label: string; fires: string }
> = {
  SessionStart: {
    label: 'SessionStart',
    fires: 'Session begins, resumes, or clears. Matcher is the session source.',
  },
  UserPromptSubmit: {
    label: 'UserPromptSubmit',
    fires: 'User submits a prompt.',
  },
  PreToolUse: {
    label: 'PreToolUse',
    fires: 'Before each tool call. Matcher is the tool name.',
  },
  PostToolUse: {
    label: 'PostToolUse',
    fires: 'After each tool call. Matcher is the tool name.',
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
    fires: 'Agent stops and returns control.',
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
