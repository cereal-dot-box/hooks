import {
  detectFormat,
  parseConfig,
  readRaw,
  stringifyConfig,
  writeConfigAtomic,
} from "./config-file.js";
import { ConfigParseError } from "./errors.js";
import type {
  EntryMutation,
  MutationResult,
  PreparedEntry,
  RemoveResult,
  RemoveTarget,
} from "./types.js";
import { MANAGED_BY } from "./types.js";

const ID_KEY = "agenthooksId";
const MARKER_KEY = "managedBy";

type Obj = Record<string, unknown>;

function asObject(v: unknown): Obj | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
}

function asArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

/** Build the innermost hook entry object with controlled field order; markers last. */
function buildEntry(entry: PreparedEntry, mark: boolean): Obj {
  const obj: Obj = { type: "command", command: entry.command };
  for (const k of Object.keys(entry.extras).sort()) obj[k] = entry.extras[k];
  if (mark) {
    obj[MARKER_KEY] = MANAGED_BY;
    obj[ID_KEY] = entry.agenthooksId;
  }
  return obj;
}

/** Compare a stored entry's payload (type, command, extras) to a prepared entry. */
function payloadEqual(stored: Obj, entry: PreparedEntry): boolean {
  if (stored.type !== "command") return false;
  if (stored.command !== entry.command) return false;
  const storedExtras: Obj = {};
  for (const k of Object.keys(stored)) {
    if (k === "type" || k === "command" || k === MARKER_KEY || k === ID_KEY) continue;
    storedExtras[k] = stored[k];
  }
  const keys = new Set([...Object.keys(storedExtras), ...Object.keys(entry.extras)]);
  for (const k of keys) {
    if (JSON.stringify(storedExtras[k]) !== JSON.stringify(entry.extras[k])) return false;
  }
  return true;
}

interface Found {
  hooks: unknown[];
  entry: Obj;
}

/** Find an existing entry by agenthooksId, searching all groups under an event. */
function findById(groups: unknown[], id: string): Found | null {
  for (const g of groups) {
    const go = asObject(g);
    if (!go) continue;
    const gh = asArray(go.hooks);
    if (!gh) continue;
    for (const e of gh) {
      const eo = asObject(e);
      if (eo && eo[ID_KEY] === id) return { hooks: gh, entry: eo };
    }
  }
  return null;
}

/** Find an existing entry by payload, within the matcher-correct group. */
function findByPayload(groups: unknown[], entry: PreparedEntry): Found | null {
  for (const g of groups) {
    const go = asObject(g);
    if (!go) continue;
    if ((go.matcher ?? undefined) !== (entry.matcher ?? undefined)) continue;
    const gh = asArray(go.hooks);
    if (!gh) continue;
    for (const e of gh) {
      const eo = asObject(e);
      if (eo && payloadEqual(eo, entry)) return { hooks: gh, entry: eo };
    }
  }
  return null;
}

function targetKey(t: RemoveTarget): string {
  if ("agenthooksId" in t) return t.agenthooksId;
  return `${t.event}|${t.matcher ?? ""}|${t.command}`;
}

function entryMatchesTarget(entry: Obj, event: string, groupMatcher: unknown, t: RemoveTarget): boolean {
  if ("agenthooksId" in t) return entry[ID_KEY] === t.agenthooksId;
  return (
    t.event === event &&
    (t.matcher ?? undefined) === (groupMatcher ?? undefined) &&
    entry.command === t.command
  );
}

export interface InstallOptions {
  /** Write marker fields (default true). */
  mark?: boolean;
}

/**
 * Pure core: install prepared entries into a parsed config object. Mutates
 * `root` in place. Returns whether anything changed and per-entry statuses.
 */
export function installHooksIntoObject(
  root: Obj,
  entries: PreparedEntry[],
  opts: InstallOptions = {},
): { changed: boolean; results: EntryMutation[] } {
  const mark = opts.mark !== false;
  let changed = false;
  const results: EntryMutation[] = [];

  let hooks = asObject(root.hooks);
  if (!hooks) {
    hooks = {};
    root.hooks = hooks;
    changed = true;
  }

  for (const entry of entries) {
    let groups = asArray(hooks[entry.event]);
    if (!groups) {
      groups = [];
      hooks[entry.event] = groups;
      changed = true;
    }

    // Find existing entry (by id when marking, by payload otherwise).
    const found = mark ? findById(groups, entry.agenthooksId) : findByPayload(groups, entry);

    if (found) {
      if (payloadEqual(found.entry, entry)) {
        results.push({ agenthooksId: entry.agenthooksId, status: "already-present" });
        continue;
      }
      const idx = found.hooks.indexOf(found.entry);
      found.hooks[idx] = buildEntry(entry, mark);
      changed = true;
      results.push({ agenthooksId: entry.agenthooksId, status: "updated" });
      continue;
    }

    // Not found: append to the matcher-correct group (create if needed).
    let group = groups.find((g) => {
      const go = asObject(g);
      return go && (go.matcher ?? undefined) === (entry.matcher ?? undefined);
    }) as Obj | undefined;
    if (!group) {
      group =
        entry.matcher !== undefined ? { matcher: entry.matcher, hooks: [] } : { hooks: [] };
      groups.push(group);
      changed = true;
    }
    let groupHooks = asArray(group.hooks);
    if (!groupHooks) {
      groupHooks = [];
      group.hooks = groupHooks;
      changed = true;
    }
    groupHooks.push(buildEntry(entry, mark));
    changed = true;
    results.push({ agenthooksId: entry.agenthooksId, status: "added" });
  }

  return { changed, results };
}

/** Install into a config file on disk. */
export function installHooksIntoConfig(
  configPath: string,
  entries: PreparedEntry[],
  opts: InstallOptions = {},
): MutationResult {
  const { raw } = readRaw(configPath);
  const parsed = parseConfig(raw, configPath);
  const root = asObject(parsed);
  if (!root) {
    throw new ConfigParseError(configPath, new Error("config root is not a JSON object"));
  }

  const { changed, results } = installHooksIntoObject(root, entries, opts);
  const format = detectFormat(raw || "{}");
  const output = stringifyConfig(root, format);
  if (changed) writeConfigAtomic(configPath, output);
  return { configPath, changed, entries: results, output, input: raw };
}

/** Remove entries matching any target from a config file on disk. */
export function removeHooksFromConfig(
  configPath: string,
  targets: RemoveTarget[],
): RemoveResult {
  const { raw } = readRaw(configPath);
  const removed: string[] = [];
  const matched = new Set<number>();

  if (raw.trim() === "" || targets.length === 0) {
    return {
      configPath,
      changed: false,
      entries: [],
      output: raw,
      input: raw,
      removed,
      notFound: targets.map(targetKey),
    };
  }

  const parsed = parseConfig(raw, configPath);
  const root = asObject(parsed);
  if (!root) {
    throw new ConfigParseError(configPath, new Error("config root is not a JSON object"));
  }

  let changed = false;
  const hooks = asObject(root.hooks);
  if (hooks) {
    for (const event of Object.keys(hooks)) {
      const groups = asArray(hooks[event]);
      if (!groups) continue;
      const keptGroups: unknown[] = [];
      for (const g of groups) {
        const go = asObject(g);
        if (!go) {
          keptGroups.push(g);
          continue;
        }
        const gh = asArray(go.hooks);
        if (!gh) {
          keptGroups.push(g);
          continue;
        }
        const groupMatcher = go.matcher;
        const before = gh.length;
        const filtered = gh.filter((e) => {
          const eo = asObject(e);
          if (!eo) return true;
          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (!t) continue;
            if (matched.has(i)) continue;
            if (entryMatchesTarget(eo, event, groupMatcher, t)) {
              matched.add(i);
              removed.push(targetKey(t));
              return false;
            }
          }
          return true;
        });
        go.hooks = filtered;
        if (filtered.length < before) changed = true;
        if (filtered.length > 0) keptGroups.push(g);
      }
      if (keptGroups.length > 0) {
        hooks[event] = keptGroups;
      } else {
        delete hooks[event];
        changed = true;
      }
    }
    if (Object.keys(hooks).length === 0) {
      delete root.hooks;
      changed = true;
    }
  }

  const notFound = targets
    .map((t, i) => (matched.has(i) ? null : targetKey(t)))
    .filter((s): s is string => s !== null);

  const format = detectFormat(raw);
  const output = changed ? stringifyConfig(root, format) : raw;
  if (changed) writeConfigAtomic(configPath, output);
  return { configPath, changed, entries: [], output, input: raw, removed, notFound };
}
