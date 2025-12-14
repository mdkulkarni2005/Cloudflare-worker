import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import fs from "fs";
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

let LOGS = [];

function pushLog(type, message) {
  LOGS.push({ type, message, time: Date.now() });
  if (LOGS.length > 300) LOGS.shift();
}

function getLogs() {
  return LOGS.slice(-200);
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
  const ctx = {
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
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/__logs") {
      return new Response(JSON.stringify(getLogs()), {
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
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

    if (url.pathname === "/__run") {
      const { route, method, body } = await req.json();
      const match = matchRoute(route, loadRoutes());
      if (!match) return new Response("Route not found", { status: 404 });

      const output = await runWorker(
        match.worker,
        { method, path: route, params: match.params },
        body
      );

      return new Response(output, { headers: CORS_HEADERS });
    }

    const match = matchRoute(url.pathname, loadRoutes());

    if (match) {
      const body = await req.text();

      const reqObj = {
        method: req.method,
        path: url.pathname,
        params: match.params,
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(req.headers),
        body
      };

      try {
        const output = await runWorker(match.worker, reqObj, body);
        return new Response(output, {
          headers: { "content-type": "text/plain", ...CORS_HEADERS }
        });
      } catch (e) {
        pushLog("error", e.message);
        return new Response("Runtime Error: " + e.message, { status: 500 });
      }
    }

    pushLog("error", "404 " + url.pathname);
    return new Response("404 Not Found", { status: 404 });
  }
});

console.log("🔥 Mini Edge Runtime running at http://localhost:3000");
