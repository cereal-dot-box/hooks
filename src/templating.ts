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
 *
 * If the original command references $HOOK_DIR / $PKG_DIR, also export them
 * as env vars prefixed to the command — so the running script can read
 * `env.HOOK_DIR` to locate itself, not just rely on `dirname(argv[1])`.
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

  const envPrefix: string[] = [];
  if (/\$\{?HOOK_DIR\}?/.test(cmd)) envPrefix.push(`HOOK_DIR=${shellQuote(ctx.scriptsDir)}`);
  if (/\$\{?PKG_DIR\}?/.test(cmd)) envPrefix.push(`PKG_DIR=${shellQuote(ctx.pkgDir)}`);
  return envPrefix.length > 0 ? `${envPrefix.join(" ")} ${out}` : out;
}
