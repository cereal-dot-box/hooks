/**
 * Private repos can be cloned when the user's git credentials allow it —
 * those installs must never be reported to the public directory. Returns
 * true only when the host's API confirms the repo is publicly readable;
 * null means unknown (rate limit, network, unsupported host) and callers
 * skip telemetry on null, matching "err on the side of caution".
 */
export async function isPublicRepo(host: string, owner: string, repo: string): Promise<boolean | null> {
  if (process.env.HOOKS_DISABLE_PRIVACY_CHECK === "1") return true;
  try {
    if (host === "github.com") {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        signal: AbortSignal.timeout(3000),
        headers: { accept: "application/vnd.github+json" },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { private?: boolean };
      return body.private === false;
    }
    if (host === "gitlab.com") {
      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { visibility?: string };
      return body.visibility === "public";
    }
    if (host === "codeberg.org") {
      const res = await fetch(`https://codeberg.org/api/v1/repos/${owner}/${repo}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { private?: boolean };
      return body.private === false;
    }
    if (host === "bitbucket.org") {
      const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { is_private?: boolean };
      return body.is_private === false;
    }
    return null;
  } catch {
    return null;
  }
}
