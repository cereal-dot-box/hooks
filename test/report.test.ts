import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { reportInstall } from "../src/report.js";

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

afterEach(() => {
  server?.close();
  server = undefined;
  delete process.env.HOOKS_DIRECTORY_URL;
  received = undefined;
});

describe("reportInstall", () => {
  it("POSTs the package id as JSON", async () => {
    const port = await startServer((body) => (received = { body }));
    process.env.HOOKS_DIRECTORY_URL = `http://127.0.0.1:${port}`;

    reportInstall("session-banner");

    // Fire-and-forget: poll briefly for the request to land.
    for (let i = 0; i < 50 && !received; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(received?.body).toBe(JSON.stringify({ packageId: "session-banner" }));
  });

  it("swallows unreachable directory errors", async () => {
    process.env.HOOKS_DIRECTORY_URL = "http://127.0.0.1:1";
    await expect(
      fetch("http://127.0.0.1:1", { signal: AbortSignal.timeout(500) }).catch(
        () => {
          throw new Error("unreachable");
        },
      ),
    ).rejects.toThrow("unreachable");
    reportInstall("session-banner"); // must not throw or hang
    await new Promise((r) => setTimeout(r, 50));
  });
});
