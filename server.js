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

const LOGS = [];
const METRICS = {};

function pushLog(type, message) {
  LOGS.push({ type, message, time: Date.now() });
  if (LOGS.length > 300) LOGS.shift();
}

function recordMetric(worker, duration, error = false) {
  if (!METRICS[worker]) {
    METRICS[worker] = {
      requests: 0,
      errors: 0,
      totalTime: 0,
      lastRequest: null
    };
  }

  const m = METRICS[worker];
  m.requests++;
  m.totalTime += duration;
  m.lastRequest = Date.now();
  if (error) m.errors++;
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

function kvDelete(key) {
  const data = JSON.parse(readFileSync(KV_JSON, "utf8"));
  delete data[key];
  writeFileSync(KV_JSON, JSON.stringify(data, null, 2));
}

function createSandbox() {
  return vm.createContext({
    fetch,
    globalThis: {},
    console: {
      log: (...args) => {
        const msg = "[worker] " + args.join(" ");
        console.log(msg);
        pushLog("log", msg);
      },
      error: (...args) => {
        const msg = "[worker-error] " + args.join(" ");
        console.error(msg);
        pushLog("error", msg);
      }
    }
  });
}

function loadWorker(name) {
  const file = path.join(WORKERS_DIR, `${name}.js`);
  if (!existsSync(file)) throw new Error("Worker not found");
  return readFileSync(file, "utf8");
}

async function runWorker(name, req, body) {
  const code = loadWorker(name);
  const ctx = createSandbox();

  ctx.KV = { get: kvGet, put: kvPut, delete: kvDelete };

  vm.runInContext(code, ctx);

  const handler = ctx.handle || ctx.globalThis.handle;
  if (typeof handler !== "function") {
    throw new Error("Worker missing globalThis.handle");
  }

  return await handler(req, body);
}

function matchRoute(pathname, routes) {
  for (const [pattern, worker] of Object.entries(routes)) {
    const params = {};

    if (pattern.includes("*")) {
      const base = pattern.replace("*", "");
      if (pathname.startsWith(base)) {
        params.wildcard = pathname.slice(base.length);
        return { worker, params };
      }
    }

    const p = pattern.split("/").filter(Boolean);
    const u = pathname.split("/").filter(Boolean);
    if (p.length !== u.length) continue;

    let ok = true;
    for (let i = 0; i < p.length; i++) {
      if (p[i].startsWith(":")) params[p[i].slice(1)] = u[i];
      else if (p[i] !== u[i]) ok = false;
    }

    if (ok) return { worker, params };
  }

  return null;
}

Bun.serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/workers/list") {
      const files = readdirSync(WORKERS_DIR)
        .filter(f => f.endsWith(".js"))
        .map(f => f.replace(".js", ""));
      return new Response(JSON.stringify(files), {
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    if (url.pathname === "/api/workers/get") {
      const name = url.searchParams.get("name");
      if (!name) return new Response("Missing name", { status: 400 });
      return new Response(loadWorker(name), {
        headers: { "content-type": "text/plain", ...CORS_HEADERS }
      });
    }

    if (url.pathname === "/api/workers/deploy") {
      const { name, code } = await req.json();
      writeFileSync(path.join(WORKERS_DIR, `${name}.js`), code);
      return new Response("OK", { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/routes/list") {
      return new Response(JSON.stringify(loadRoutes()), {
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    if (url.pathname === "/api/routes/add") {
      const { path: route, worker } = await req.json();
      const routes = loadRoutes();
      routes[route] = worker;
      writeFileSync(ROUTES_JSON, JSON.stringify(routes, null, 2));
      return new Response("OK", { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/routes/delete") {
      const { path: route } = await req.json();
      const routes = loadRoutes();
      delete routes[route];
      writeFileSync(ROUTES_JSON, JSON.stringify(routes, null, 2));
      return new Response("OK", { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/metrics") {
      return new Response(JSON.stringify(METRICS), {
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const match = matchRoute(url.pathname, loadRoutes());

    if (match) {
      const body = await req.text();
      const start = Date.now();

      try {
        const output = await runWorker(
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

        recordMetric(match.worker, Date.now() - start);
        return new Response(output, {
          headers: { "content-type": "text/plain", ...CORS_HEADERS }
        });
      } catch (e) {
        recordMetric(match.worker, Date.now() - start, true);
        pushLog("error", e.message);
        return new Response("Runtime Error: " + e.message, { status: 500 });
      }
    }

    return new Response("404 Not Found", { status: 404 });
  }
});

console.log("🔥 Mini Edge Runtime running at http://localhost:3000");
