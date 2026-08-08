import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { MANIFEST_FILENAME } from "./constants.js";
import { ManifestValidationError } from "./errors.js";
import type { HookEvent, HookManifest } from "./types.js";

const VALID_EVENTS: HookEvent[] = [
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
  "Notification",
  "SubagentStop",
  "PreCompact",
];

const ID_RE = /^[a-z0-9-]+$/;

export function validateManifest(mf: unknown, manifestPath: string): asserts mf is HookManifest {
  if (!mf || typeof mf !== "object" || Array.isArray(mf)) {
    throw new ManifestValidationError(manifestPath, "root must be a JSON object");
  }
  const m = mf as Record<string, unknown>;
  if (typeof m.name !== "string" || m.name.trim() === "") {
    throw new ManifestValidationError(manifestPath, "name must be a non-empty string");
  }
  if (!Array.isArray(m.hooks) || m.hooks.length === 0) {
    throw new ManifestValidationError(manifestPath, "hooks must be a non-empty array");
  }

  const validSet = new Set<string>(VALID_EVENTS);
  const seenIds = new Set<string>();
  m.hooks.forEach((h, i) => {
    if (!h || typeof h !== "object" || Array.isArray(h)) {
      throw new ManifestValidationError(manifestPath, `hooks[${i}] must be an object`);
    }
    const hook = h as Record<string, unknown>;
    if (typeof hook.id !== "string" || !ID_RE.test(hook.id)) {
      throw new ManifestValidationError(
        manifestPath,
        `hooks[${i}].id must match [a-z0-9-]+ (got "${String(hook.id)}")`,
      );
    }
    if (seenIds.has(hook.id)) {
      throw new ManifestValidationError(manifestPath, `hooks[${i}].id "${hook.id}" is duplicated`);
    }
    seenIds.add(hook.id);
    if (typeof hook.event !== "string" || !validSet.has(hook.event)) {
      throw new ManifestValidationError(
        manifestPath,
        `hooks[${i}].event "${String(hook.event)}" is not a supported event`,
      );
    }
    if (typeof hook.command !== "string" || hook.command.trim() === "") {
      throw new ManifestValidationError(manifestPath, `hooks[${i}].command must be a non-empty string`);
    }
    if (hook.matcher !== undefined && typeof hook.matcher !== "string") {
      throw new ManifestValidationError(manifestPath, `hooks[${i}].matcher must be a string`);
    }
    if (hook.agents !== undefined && (typeof hook.agents !== "object" || hook.agents === null)) {
      throw new ManifestValidationError(manifestPath, `hooks[${i}].agents must be an object`);
    }
  });
}

export interface LoadedManifest {
  manifest: HookManifest;
  manifestPath: string;
  pkgDir: string;
  /** sha256 of the raw manifest text, first 12 hex chars. */
  manifestHash: string;
}

export function loadManifest(pkgDir: string): LoadedManifest {
  const manifestPath = join(pkgDir, MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    throw new ManifestValidationError(manifestPath, `${MANIFEST_FILENAME} not found`);
  }
  let raw: string;
  let parsed: unknown;
  try {
    raw = readFileSync(manifestPath, "utf8");
    parsed = JSON.parse(raw);
  } catch {
    throw new ManifestValidationError(manifestPath, "failed to parse JSON");
  }
  validateManifest(parsed, manifestPath);
  const manifestHash = createHash("sha256").update(raw).digest("hex").slice(0, 12);
  return { manifest: parsed, manifestPath, pkgDir: resolve(pkgDir), manifestHash };
}
