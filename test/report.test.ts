import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { flushTelemetry, reportInstall, type InstallReport } from "../src/report.js";

let server: ReturnType<typeof createServer> | undefined;
let received: { body: string } | undefined;

function startServer(handler: (body: string) => void): Promise<number> {
  return new Promise((resolve) => {
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        handler(body);
        res.statusCode = 204;
        res.end();
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve((server!.address() as { port: number }).port);
    });
  });
}

function sampleReport(overrides: Partial<InstallReport> = {}): InstallReport {
  return {
    event: "install",
    host: "github.com",
    owner: "acme",
    repo: "hooks",
    path: "pkgs/banner",
    manifestHash: "abc123",
    manifest: {
      name: "banner",
      description: "prints a banner",
      files: ["run.sh"],
      hooks: [{ id: "print-banner", event: "SessionStart", command: "bash $HOOK_DIR/run.sh" }],
    },
    fileContents: { "run.sh": "echo hi" },
    readme: "# banner",
    agents: ["claude-code", "codex"],
    ...overrides,
  };
}

afterEach(() => {
  server?.close();
  server = undefined;
  delete process.env.HOOKS_DIRECTORY_URL;
  delete process.env.DISABLE_TELEMETRY;
  delete process.env.DO_NOT_TRACK;
  received = undefined;
});

describe("reportInstall", () => {
  it("POSTs the self-registration payload as JSON", async () => {
    const port = await startServer((body) => (received = { body }));
    process.env.HOOKS_DIRECTORY_URL = `http://127.0.0.1:${port}`;

    reportInstall(sampleReport());
    await flushTelemetry();

    expect(received?.body).toBe(JSON.stringify(sampleReport()));
  });

  it("sends nothing when telemetry is disabled", async () => {
    const port = await startServer((body) => (received = { body }));
    process.env.HOOKS_DIRECTORY_URL = `http://127.0.0.1:${port}`;
    process.env.DISABLE_TELEMETRY = "1";

    reportInstall(sampleReport());
    await flushTelemetry();
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toBeUndefined();
  });

  it("caps total file contents", async () => {
    const port = await startServer((body) => (received = { body }));
    process.env.HOOKS_DIRECTORY_URL = `http://127.0.0.1:${port}`;

    reportInstall(
      sampleReport({
        fileContents: { "a.sh": "x".repeat(60_000), "b.sh": "y".repeat(60_000), "c.sh": "z" },
      }),
    );
    await flushTelemetry();

    const sent = JSON.parse(received!.body) as InstallReport;
    expect(Object.keys(sent.fileContents)).toEqual(["a.sh"]);
  });

  it("swallows unreachable directory errors", async () => {
    process.env.HOOKS_DIRECTORY_URL = "http://127.0.0.1:1";
    reportInstall(sampleReport()); // must not throw
    await flushTelemetry();
  });
});
