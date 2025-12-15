import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKERS_DIR = path.join(__dirname, "workers");
const ROUTES_JSON = path.join(__dirname, "routes.json");
const KV_JSON = path.join(__dirname, "kv.json");

if (!existsSync(KV_JSON)) writeFileSync(KV_JSON, "{}");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

let TRAFFIC = [];
let LOGS = [];

function pushLog(type, message) {
  LOGS.push({ type, message, time: Date.now() });
  if (LOGS.length > 300) LOGS.shift();
}

function recordTraffic(entry) {
  TRAFFIC.unshift(entry);
  if (TRAFFIC.length > 200) TRAFFIC.pop();
}

function loadRoutes() {
  return existsSync(ROUTES_JSON)
    ? JSON.parse(readFileSync(ROUTES_JSON, "utf8"))
    : {};
}

function kvGet(key) {
  return JSON.parse(readFileSync(KV_JSON, "utf8"))[key] ?? null;
}

function kvPut(key, value) {
  const data = JSON.parse(readFileSync(KV_JSON, "utf8"));
  data[key] = value;
  writeFileSync(KV_JSON, JSON.stringify(data, null, 2));
}

function createSandbox() {
  const ctx = {
    console: {
      log: (...args) => pushLog("log", args.join(" ")),
      error: (...args) => pushLog("error", args.join(" "))
    },
    fetch,
    globalThis: {}
  };
  return vm.createContext(ctx);
}

function loadWorker(name) {
  const file = path.join(WORKERS_DIR, `${name}.js`);
  if (!existsSync(file)) throw new Error("Worker not found");
  return readFileSync(file, "utf8");
}

async function runWorker(name, req, body) {
  const code = loadWorker(name);
  const ctx = createSandbox();
  ctx.KV = { get: kvGet, put: kvPut, delete: () => {} };
  vm.runInContext(code, ctx);

  const handler = ctx.handle || ctx.globalThis.handle;
  if (typeof handler !== "function") {
    throw new Error("Worker missing globalThis.handle");
  }

  return await handler(req, body);
}

function matchRoute(pathname, routes) {
  for (const [pattern, worker] of Object.entries(routes)) {
    const p = pattern.split("/").filter(Boolean);
    const u = pathname.split("/").filter(Boolean);
    if (p.length !== u.length) continue;

    const params = {};
    let ok = true;

    for (let i = 0; i < p.length; i++) {
      if (p[i].startsWith(":")) {
        params[p[i].slice(1)] = u[i];
      } else if (p[i] !== u[i]) {
        ok = false;
        break;
      }
    }

    if (ok) return { worker, params };
  }
  return null;
}

Bun.serve({
  port: 3000,

  async fetch(req) {
    const start = performance.now();
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/traffic") {
      return new Response(JSON.stringify(TRAFFIC), {
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    if (url.pathname.startsWith("/api/traffic/")) {
      const id = url.pathname.split("/").pop();
      const entry = TRAFFIC.find(t => t.id === id);
      return new Response(JSON.stringify(entry ?? null), {
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const match = matchRoute(url.pathname, loadRoutes());

    if (match) {
      const body = await req.text();
      let status = "ok";
      let result = "";
      let error = null;

      try {
        result = await runWorker(
          match.worker,
          {
            method: req.method,
            path: url.pathname,
            params: match.params,
            query: Object.fromEntries(url.searchParams),
            headers: Object.fromEntries(req.headers)
          },
          body
        );
      } catch (e) {
        status = "error";
        error = e.message;
        result = "Runtime Error";
      }

      const duration = Math.round(performance.now() - start);

      recordTraffic({
        id: crypto.randomUUID(),
        time: Date.now(),
        route: url.pathname,
        worker: match.worker,
        method: req.method,
        status,
        duration,
        request: {
          headers: Object.fromEntries(req.headers),
          query: Object.fromEntries(url.searchParams),
          body: body.slice(0, 2000)
        },
        response: {
          body: String(result).slice(0, 2000)
        },
        error
      });

      return new Response(result, {
        headers: { "content-type": "text/plain", ...CORS_HEADERS },
        status: status === "ok" ? 200 : 500
      });
    }

    return new Response("404 Not Found", { status: 404 });
  }
});

console.log("🔥 Mini Edge Runtime running at http://localhost:3000");
