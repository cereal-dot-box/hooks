import { createServer, type Server } from "node:http";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fetchGithubPackage } from "../src/github-source.js";
import type { GitHubSource } from "../src/source-parser.js";

const manifest = {
  name: "banner",
  hooks: [{ id: "print-banner", event: "SessionStart", command: "node $HOOK_DIR/banner.mjs" }],
  files: ["banner.mjs", "lib/util.mjs"],
};

let server: Server | undefined;
let base = "";

beforeEach(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? "";
    if (url === "/acme/hooks/HEAD/hooks.json") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(manifest));
      return;
    }
    if (url === "/acme/hooks/HEAD/banner.mjs") {
      res.end("console.log('banner')");
      return;
    }
    if (url === "/acme/hooks/HEAD/lib/util.mjs") {
      res.end("export const util = 1");
      return;
    }
    if (url === "/acme/hooks/HEAD/sub/hooks.json") {
      res.end(JSON.stringify({ ...manifest, name: "sub-banner", files: ["banner.mjs"] }));
      return;
    }
    if (url === "/acme/hooks/HEAD/sub/banner.mjs") {
      res.end("console.log('sub')");
      return;
    }
    if (url === "/acme/broken/HEAD/hooks.json") {
      res.end(JSON.stringify({ ...manifest, files: ["missing.mjs"] }));
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });
  base = await new Promise<string>((resolve) => {
    server!.listen(0, "127.0.0.1", () => {
      const addr = server!.address() as { port: number };
      resolve(`http://127.0.0.1:${addr.port}`);
    });
  });
});

afterEach(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

const gh = (over: Partial<GitHubSource> = {}): GitHubSource => ({
  sourceType: "github",
  owner: "acme",
  repo: "hooks",
  ...over,
});

describe("fetchGithubPackage", () => {
  it("stages the manifest and listed files", async () => {
    const staged = await fetchGithubPackage(gh(), base);
    try {
      expect(readFileSync(join(staged.pkgDir, "hooks.json"), "utf8")).toBe(JSON.stringify(manifest));
      expect(readFileSync(join(staged.pkgDir, "banner.mjs"), "utf8")).toBe("console.log('banner')");
      expect(readFileSync(join(staged.pkgDir, "lib/util.mjs"), "utf8")).toBe("export const util = 1");
      expect(staged.sourceUrl).toBe("https://github.com/acme/hooks");
    } finally {
      rmSync(staged.pkgDir, { recursive: true, force: true });
    }
  });

  it("honors the subpath", async () => {
    const staged = await fetchGithubPackage(gh({ subPath: "sub" }), base);
    try {
      expect(existsSync(join(staged.pkgDir, "banner.mjs"))).toBe(true);
    } finally {
      rmSync(staged.pkgDir, { recursive: true, force: true });
    }
  });

  it("throws a clear error when the manifest is missing", async () => {
    await expect(fetchGithubPackage(gh({ repo: "nope" }), base)).rejects.toThrow(
      /no hooks\.json found/,
    );
  });

  it("throws when a listed file is missing", async () => {
    await expect(fetchGithubPackage(gh({ repo: "broken" }), base)).rejects.toThrow(
      /package file not found: missing\.mjs/,
    );
  });
});
