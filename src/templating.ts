export interface TemplateContext {
  /** Absolute path where the package's `files` were copied. */
  scriptsDir: string;
  /** Resolved source dir at install time (for in-place local sources). */
  pkgDir: string;
}

/** Single-quote a string for safe shell interpolation. */
function shellQuote(s: string): string {
  if (s === "") return "''";
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/**
 * Expand $HOOK_DIR / ${HOOK_DIR} and $PKG_DIR / ${PKG_DIR} in a command.
 * A trailing path suffix (`/foo/bar`) is captured and quoted as a single
 * shell token, so paths containing spaces stay intact.
 */
export function templateCommand(cmd: string, ctx: TemplateContext): string {
  let out = cmd.replace(
    /(\$\{HOOK_DIR\}|\$HOOK_DIR)(\/[^\s'"]*)?/g,
    (_m, _tok: string, suffix: string | undefined) =>
      shellQuote(ctx.scriptsDir + (suffix ?? "")),
  );
  out = out.replace(
    /(\$\{PKG_DIR\}|\$PKG_DIR)(\/[^\s'"]*)?/g,
    (_m, _tok: string, suffix: string | undefined) => shellQuote(ctx.pkgDir + (suffix ?? "")),
  );
  return out;
}
