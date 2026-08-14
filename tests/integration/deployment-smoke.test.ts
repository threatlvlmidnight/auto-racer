import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  RELEASE_REVISION,
  RELEASE_SHORT_REVISION,
  REPRESENTATIVE_SMOKE_ASSETS,
  VALID_DEMO_TAG,
} from "../fixtures/deployment-fixtures";

/**
 * 031-demo-deployment T034: smoke-check behavior, driven black-box through
 * scripts/smoke-demo.mjs against local HTTP fixture servers. Covers bounded
 * retries, entry/module/asset/identity checks, empty bodies, HTTP failures,
 * and network errors — the checker must observe and diagnose, never mutate.
 */

const ROOT = join(__dirname, "..", "..");
const SMOKE_SCRIPT = join(ROOT, "scripts", "smoke-demo.mjs");
const BASE = "/auto-racer/";

interface Route {
  status: number;
  type: string;
  body: string;
}

type RouteTable = Record<string, Route | ((callCount: number) => Route)>;

interface FixtureServer {
  origin: string;
  pageUrl: string;
  close(): Promise<void>;
}

const servers: FixtureServer[] = [];

function moduleBody(tag: string, revision: string): string {
  return `export const tag = "${tag}"; export const revision = "${revision}";`;
}

function entryHtml(): string {
  return `<!doctype html><html><head><script type="module" crossorigin src="${BASE}assets/index-smoke.js"></script></head><body></body></html>`;
}

function healthyRoutes(): RouteTable {
  const routes: RouteTable = {
    [`${BASE}`]: { status: 200, type: "text/html", body: entryHtml() },
    [`${BASE}assets/index-smoke.js`]: {
      status: 200,
      type: "text/javascript",
      body: moduleBody(VALID_DEMO_TAG, RELEASE_REVISION),
    },
  };
  for (const relative of REPRESENTATIVE_SMOKE_ASSETS) {
    routes[`${BASE}${relative}?rev=${RELEASE_SHORT_REVISION}`] = {
      status: 200,
      type: "application/octet-stream",
      body: `fixture-bytes:${relative}`,
    };
  }
  return routes;
}

function startServer(routes: RouteTable): Promise<FixtureServer> {
  return new Promise((resolvePromise) => {
    const callCounts: Record<string, number> = {};
    const server = createServer((req, res) => {
      const path = (req.url ?? "").split("#")[0];
      callCounts[path] = (callCounts[path] ?? 0) + 1;
      const route = routes[path];
      const resolved = typeof route === "function" ? route(callCounts[path]) : route;
      if (resolved === undefined) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
        return;
      }
      res.writeHead(resolved.status, { "content-type": resolved.type });
      res.end(resolved.body);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      const origin = `http://127.0.0.1:${port}`;
      const fixture: FixtureServer = {
        origin,
        pageUrl: `${origin}${BASE}`,
        close: () =>
          new Promise<void>((done) => {
            // Node fetch keeps pooled connections open; drop them so close()
            // can complete instead of hanging the suite teardown.
            server.closeAllConnections();
            server.close(() => done());
          }),
      };
      servers.push(fixture);
      resolvePromise(fixture);
    });
  });
}

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    if (server) await server.close();
  }
});

function runSmoke(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  // Async on purpose: the fixture servers live in this same process, so a
  // synchronous spawn would deadlock the event loop that must answer the
  // child's HTTP requests.
  return new Promise((resolvePromise) => {
    execFile(process.execPath, [SMOKE_SCRIPT, ...args], { encoding: "utf-8", timeout: 60_000 }, (error, stdout, stderr) => {
      const status = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
      resolvePromise({ status, stdout: stdout ?? "", stderr: stderr ?? "" });
    });
  });
}

function smokeArgs(pageUrl: string, tag: string = VALID_DEMO_TAG, revision: string = RELEASE_REVISION): string[] {
  return ["--url", pageUrl, "--tag", tag, "--revision", revision, "--timeout-ms", "1500", "--retry-delay-ms", "100"];
}

describe("T034: healthy deployments pass", () => {
  it("passes when entry, module, identity, and representative assets are all healthy", async () => {
    const server = await startServer(healthyRoutes());
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("healthy");
    expect(result.stdout).toContain(server.pageUrl);
  });
});

describe("T034: bounded availability retries", () => {
  it("recovers after transient entry failures and reports the attempt count", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}`] = (callCount) =>
      callCount <= 2
        ? { status: 503, type: "text/plain", body: "unavailable" }
        : { status: 200, type: "text/html", body: entryHtml() };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/3 attempt/);
  });

  it("fails with bounded retries when the entry never becomes available", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}`] = { status: 500, type: "text/plain", body: "broken" };
    const server = await startServer(routes);
    const startedAt = Date.now();
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unhealthy");
    expect(result.stderr).toContain(server.pageUrl);
    expect(result.stderr).toContain("HTTP 500");
    expect(result.stderr).toContain("no automatic rollback");
    // Bounded: the 1500 ms budget plus overhead, never an open-ended wait.
    expect(Date.now() - startedAt).toBeLessThan(30_000);
  });

  it("fails bounded against a connection-refused endpoint", async () => {
    // Reserve a port, close the server, then point the checker at the dead port.
    const server = await startServer({});
    const deadUrl = server.pageUrl;
    await server.close();
    servers.splice(servers.indexOf(server), 1);
    const result = await runSmoke(smokeArgs(deadUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("entry-availability");
    expect(result.stderr).toContain("network error");
  });
});

describe("T034: entry and module diagnostics", () => {
  it("fails when the entry content type is not HTML", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}`] = { status: 200, type: "text/plain", body: "not html" };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("entry-content");
  });

  it("fails when the entry references no module at all", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}`] = { status: 200, type: "text/html", body: "<!doctype html><html></html>" };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("entry-module-reference");
  });

  it("names the exact module URL when the module is missing", async () => {
    const routes = healthyRoutes();
    delete routes[`${BASE}assets/index-smoke.js`];
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${BASE}assets/index-smoke.js`);
    expect(result.stderr).toContain("module-fetch");
  });
});

describe("T034: identity and asset diagnostics", () => {
  it("fails on an identity mismatch and names the assertion", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}assets/index-smoke.js`] = {
      status: 200,
      type: "text/javascript",
      body: moduleBody("demo-v9.9.9", "f".repeat(40)),
    };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("identity-tag");
    expect(result.stderr).toContain("identity-revision");
  });

  it("names the exact missing representative asset URL", async () => {
    const routes = healthyRoutes();
    delete routes[`${BASE}assets/title-race.svg?rev=${RELEASE_SHORT_REVISION}`];
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`assets/title-race.svg?rev=${RELEASE_SHORT_REVISION}`);
    expect(result.stderr).toContain("representative-asset");
  });

  it("rejects empty asset bodies", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}assets/items/families/coachworks-power.png?rev=${RELEASE_SHORT_REVISION}`] = {
      status: 200,
      type: "application/octet-stream",
      body: "",
    };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("empty body");
  });

  it("detects SPA-fallback hosts serving the entry HTML for a missing asset", async () => {
    // vite preview (and SPA-fallback hosting in general) answers missing
    // paths with HTTP 200 + index.html; the checker must read that as a
    // missing asset, not a healthy one.
    const routes = healthyRoutes();
    routes[`${BASE}assets/backgrounds/regions/british-isles.png?rev=${RELEASE_SHORT_REVISION}`] = {
      status: 200,
      type: "text/html",
      body: entryHtml(),
    };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("entry fallback");
    expect(result.stderr).toContain("british-isles.png");
  });

  it("prints recovery instructions pointing at manual previous-tag redeployment", async () => {
    const routes = healthyRoutes();
    routes[`${BASE}`] = { status: 500, type: "text/plain", body: "broken" };
    const server = await startServer(routes);
    const result = await runSmoke(smokeArgs(server.pageUrl));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("previous healthy demo tag");
  });
});
