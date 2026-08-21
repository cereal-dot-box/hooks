const DEFAULT_DIRECTORY_URL = "https://hooks.cereal.box";

/**
 * Fire-and-forget install telemetry. Never blocks, never logs, never throws —
 * a directory that is unreachable (or not deployed yet) must not affect the
 * install experience.
 */
export function reportInstall(packageName: string): void {
  const base = process.env.HOOKS_DIRECTORY_URL ?? DEFAULT_DIRECTORY_URL;
  void fetch(`${base}/api/install`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ packageId: packageName }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}
