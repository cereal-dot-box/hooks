# How `matcher` works

`matcher` shows up in two places — the agent's config file and your hook package manifest — and it does the same job in both: **filter which triggers actually fire the hook**, by matching a regex against some event-specific input.

## In the agent config file

Hooks for an event live in matcher *groups*:

```json
"PreToolUse": [
  { "matcher": "Bash",       "hooks": [...] },
  { "matcher": "Edit|Write", "hooks": [...] },
  { "hooks": [...] }
]
```

When the event fires, the agent walks the groups and runs hooks from any group whose `matcher` matches. No matcher = matches everything for that event.

## What matcher is matched *against*, per event

| Event | Matched against |
|---|---|
| `PreToolUse`, `PostToolUse` | the tool name (`Bash`, `Edit`, `Write`, `MultiEdit`, `Read`, …) |
| `SessionStart` | the session source (`startup`, `resume`, `clear`) |
| `UserPromptSubmit`, `Stop`, `Notification`, `SubagentStop`, `PreCompact` | usually no matcher — fires on every occurrence |

Examples:

- `"matcher": "Bash"` — only Bash
- `"matcher": "Edit|Write|MultiEdit"` — any file-editing tool
- `"matcher": "startup|resume"` — fires on session start/resume but not on `/clear`
- no matcher — every tool / every prompt / every stop

It's a regex, so `|` is alternation, not glob-style.

## How hooks uses it

In the manifest you usually write one matcher, and hooks groups by it during merge. From `test/fixtures/example-pkg/hooks.json`:

```json
{ "id": "log-bash-calls", "event": "PreToolUse", "matcher": "Bash", "command": "..." }
```

In the merge engine, `matcher` is the **grouping key**: hooks finds (or creates) the group whose `matcher === entry.matcher` and appends/updates the entry inside that group. Two installed hooks with `matcher: "Bash"` end up in the same group; different matchers end up in separate groups. That's the only way to keep user entries, our entries, and entries from other packages all coexisting in the same config file.

## Per-agent overrides

Sometimes the *same logical hook* needs a different matcher per agent. The `example-pkg` `SessionStart` hook is the canonical case:

- Claude Code fires `SessionStart` on every session start → no matcher needed.
- Codex `SessionStart` can be `startup`, `resume`, or `clear` → you typically want `startup|resume` so you don't re-fire on `/clear`.

So the manifest supports per-agent overrides:

```json
{
  "id": "print-session-banner",
  "event": "SessionStart",
  "command": "node $HOOK_DIR/onstart.mjs",
  "agents": { "codex": { "matcher": "startup|resume" } }
}
```

The adapter applies that override during `adaptHook`, so the Claude Code config gets no matcher and the Codex config gets `"matcher": "startup|resume"`.

## TL;DR

- `matcher` is a regex filter — without it, the hook fires on every occurrence of the event.
- What it matches depends on the event: tool name for `Pre/PostToolUse`, session source for `SessionStart`.
- In hooks it's also the grouping key in the merge engine, so don't think of it as decorative — it determines which bucket the entry lands in.
- Use `agents.<name>.matcher` when the same hook needs different filtering per agent.
