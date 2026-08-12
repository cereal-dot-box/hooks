# agenthooks

> Install lifecycle hooks into Claude Code and Codex from a portable package. The hooks analog of [`npx skills`](https://github.com/vercel-labs/skills).

**Status:** pre-1.0. MVP supports Claude Code + Codex and the `add` / `list` / `remove` commands against local package directories. Remote sources (`github:` / `npm:`) are planned.

## What it does

`agenthooks` installs hook definitions (SessionStart, PreToolUse, Stop, ...) into your AI coding agent's config file by **merging into the existing JSON** — idempotently and reversibly. One command installs a hook *package* across every supported agent; one command removes it cleanly, even after you've hand-edited things.

```sh
npx @cerealbox/hooks add ./my-hooks    # merge into ~/.claude/settings.json + ~/.codex/hooks.json
npx @cerealbox/hooks list              # show installed packages + drift status
npx @cerealbox/hooks remove my-hooks   # remove exactly what was added
```

## Hook package format

A hook package is a directory with a `hooks.json` manifest:

```json
{
  "name": "my-hooks",
  "description": "Personal workflow hooks.",
  "version": 1,
  "files": ["scripts/onstart.mjs"],
  "hooks": [
    {
      "id": "session-banner",
      "event": "SessionStart",
      "command": "node $HOOK_DIR/onstart.mjs",
      "agents": { "codex": { "matcher": "startup|resume" } }
    },
    {
      "id": "log-bash",
      "event": "PreToolUse",
      "matcher": "Bash",
      "command": "node $HOOK_DIR/logbash.mjs",
      "additionalContextLimit": 5000
    }
  ]
}
```

- `id` — stable, unique within the package (`[a-z0-9-]+`). Used as the removal key.
- `event` — one of the agent lifecycle events (`SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, ...).
- `command` — the shell command. `$HOOK_DIR` (or `${HOOK_DIR}`) expands to that hook's installed scripts dir (`~/.agents/hooks/<hookId>/`).
- `matcher` — event-specific regex (tool name, session source, ...). See [`docs/matcher.md`](docs/matcher.md) for the full story.
- `agents.<name>` — per-agent overrides for `command` / `matcher`.
- `additionalContextLimit` / `statusMessage` — Codex-only fields; ignored by Claude Code.
- `files` — scripts copied into a managed dir and referenced via `$HOOK_DIR`.

## How it works

Each installed entry is written with two trailing marker fields — `managedBy: "agenthooks"` and `agenthooksId: "<package>:<hookId>"` — so ownership is O(1) and removal is deterministic even if you later edit the command or matcher. A sidecar lock at `~/.agents/agenthooks.json` is the book of record and powers `list` drift detection and script garbage-collection. `remove` filters by `agenthooksId` and cleans up empty groups, so your config returns to its prior state. Each hook's scripts live at `~/.agents/hooks/<hookId>/`, GC'd on remove.

Your existing formatting (indent size, trailing newline, key order, unrelated keys like `permissions` or `env`) is preserved on every write. Unparseable config files are never overwritten.

## Scope

Installs are **global by default** (`~/.claude/settings.json`, `~/.codex/hooks.json`). Pass `--project` / `-p` to target `./.claude/` + `./.codex/` instead (committable, team-shared).

## License

MIT
