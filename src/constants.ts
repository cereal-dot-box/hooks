import { homedir } from "node:os";
import { join } from "node:path";

/** Root managed dir (lock + installed hooks). Override with HOOKS_HOME (used by tests). */
export const MANAGED_DIR =
  process.env.HOOKS_HOME ?? join(homedir(), ".agents");

/** Global lock — the book of record for installed packages. */
export const GLOBAL_LOCK_PATH = join(MANAGED_DIR, "hooks.json");
/** Installed hooks root, keyed per hook id: <MANAGED_DIR>/hooks/<hookId>/. */
export const HOOKS_ROOT = join(MANAGED_DIR, "hooks");
export const PROJECT_LOCK_NAME = "hooks-lock.json";
export const MANIFEST_FILENAME = "hooks.json";
