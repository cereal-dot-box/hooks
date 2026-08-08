import { homedir } from "node:os";
import { join } from "node:path";

/** Root managed dir. Override with AGENTHOOKS_HOME (used by tests). */
export const MANAGED_DIR =
  process.env.AGENTHOOKS_HOME ?? join(homedir(), ".agenthooks");

export const GLOBAL_LOCK_PATH = join(MANAGED_DIR, "installed.json");
export const SCRIPTS_ROOT = join(MANAGED_DIR, "scripts");
export const PROJECT_LOCK_NAME = "hooks-lock.json";
export const MANIFEST_FILENAME = "hooks.json";
