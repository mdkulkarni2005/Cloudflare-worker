// server.js (routing-enabled)
// Bun runtime mini-edge with routes + deploy support
import { createContext, Script } from "node:vm";
import fs from "fs";
import path from "path";

const WORKERS_DIR = path.resolve("./workers");
const ROUTES_PATH = path.resolve("./routes.json");
const KV_DB_PATH = "./kv.db.json";

// ---- KV helpers ----
async function loadKV() {
  try {
    const file = await Bun.file(KV_DB_PATH).json();
    return file || {};
  } catch { return {}; }
}
async function saveKV(data) { await Bun.write(KV_DB_PATH, JSON.stringify(data, null, 2)); }
async function kvGet(key) { const db = await loadKV(); return db[key] ?? null; }
async function kvPut(key, value) { const db = await loadKV(); db[key] = value; await saveKV(db); }
async function kvDelete(key) { const db = await loadKV(); delete db[key]; await saveKV(db); }

// ---- Safe fetch shim ----
const OUTBOUND_ALLOWLIST = ["api.github.com","jsonplaceholder.typicode.com","httpbin.org"];
function makeSafeFetch() {
  return async function safeFetch(input, init={}) {
    try {
      const url = new URL(input);
      if (!OUTBOUND_ALLOWLIST.includes(url.hostname)) throw new Error(`Outbound domain not allowed: ${url.hostname}`);
      console.log("[host] outgoing fetch to", url.toString());
      const resp = await fetch(url.toString(), init);
      const text = await resp.text();
      return { status: resp.status, headers: Object.fromEntries(resp.headers), text };
    } catch (e) { return { error: e?.message || String(e) }; }
  };
}

// ---- Response class for workers ----
class WorkerResponse {
  constructor(body, options={}) { this.body = body; this.status = options.status || 200; this.headers = options.headers || {}; }
}

// ---- Routes loader & matcher ----
function loadRoutes() {
  try {
    const raw = fs.readFileSync(ROUTES_PATH, "utf8");
    const obj = JSON.parse(raw);
    // convert to array of { pattern, target, regex, keys }
    return Object.entries(obj).map(([pattern, target]) => {
      // escape regex special chars, then replace :param and * with capture groups
      let regexStr = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&");
      // replace :param -> ([^/]+)
      regexStr = regexStr.replace(/\\:([a-zA-Z0-9_]+)/g, "([^/]+)");
      // replace wildcard \* -> (.*)
      regexStr = regexStr.replace(/\\\*/g, "(.*)");
      const regex = new RegExp("^" + regexStr + "$");
      return { pattern, target, regex };
    });
  } catch (e) {
    return []; // no routes.json
  }
}

function matchRoute(pathname, routes) {
  // prefer exact match first
  for (const r of routes) {
    if (r.pattern === pathname) return { target: r.target, params: {} };
  }
  // then regex match in order
  for (const r of routes) {
    const m = pathname.match(r.regex);
    if (m) {
      // capture groups -> params as param1, param2... (we didn't track names)
      const captures = m.slice(1);
      return { target: r.target, params: captures };
    }
  }
  return null;
}

// ---- Sandbox context ----
function createSandboxContext() {
  return createContext({
    console: {
      log: (...args) => console.log("[worker]", ...args),
      error: (...args) => console.error("[worker]", ...args)
    },
    fetch: undefined,
    KV: { get: kvGet, put: kvPut, delete: kvDelete },
    Response: WorkerResponse,
    globalThis: {}
  });
}

// ---- worker loader ----
async function loadWorkerSource(name) {
  const p = path.join(WORKERS_DIR, `${name}.js`);
  if (!fs.existsSync(p)) throw new Error("Worker not found: " + name);
  return await Bun.file(p).text();
}
function initWorkerInContext(code, workerName) {
  const wrapped = `(function(){ try { ${code} } catch(e) { globalThis.__init_error = e?.message || String(e);} return globalThis; })();`;
  const ctx = createSandboxContext();
  const safeFetch = makeSafeFetch();
  ctx.fetch = safeFetch; ctx.globalThis.fetch = safeFetch;
  const script = new Script(wrapped, { filename: workerName + ".js" });
  const globalAfter = script.runInContext(ctx, { timeout: 300 });
  if (globalAfter.__init_error) throw new Error("Worker init error: " + globalAfter.__init_error);
  return { ctx, handle: globalAfter.handle };
}

// ---- call with timeout ----
async function callHandlerWithTimeout(fn, ctx, requestObject, rawBody, timeoutMs = 2000) {
  let workerCall;
  try {
    if (fn.length === 1) workerCall = fn.call(ctx, requestObject);
    else workerCall = fn.call(ctx, rawBody);
  } catch (e) { return { error: e.message }; }
  const handlerPromise = Promise.resolve(workerCall);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("handler timeout")), timeoutMs));
  try { return { value: await Promise.race([handlerPromise, timeoutPromise]) }; }
  catch (e) { return { error: e.message }; }
}

// ---- run worker by worker name ----
async function runWorkerByName(workerName, req, body) {
  const code = await loadWorkerSource(workerName);
  const requestObject = { method: req.method, url: req.url, headers: Object.fromEntries(req.headers), text: async()=>body, json: async()=>JSON.parse(body||"{}") };
  const { ctx, handle } = initWorkerInContext(code, workerName);
  if (typeof handle !== "function") throw new Error("Worker missing globalThis.handle");
  return await callHandlerWithTimeout(handle, ctx, requestObject, body);
}

// ---- HTTP server with routing ----
Bun.serve({
  port: 3000,
  async fetch(req) {
    try {
      const url = new URL(req.url);
      const pathname = url.pathname;
      const body = await req.text();

      const routes = loadRoutes();
      const matched = matchRoute(pathname, routes);

      let workerName = null;
      if (matched) workerName = matched.target;
      else {
        // fallback - try filename from path (strip leading slash and remove extensions)
        const candidate = pathname.replace(/^\//, "") || "hello";
        workerName = candidate || "hello";
      }

      // run the worker
      const { value, error } = await runWorkerByName(workerName, req, body);
      if (error) {
        if (error === "handler timeout") return new Response("Worker timeout", { status: 504 });
        return new Response("Runtime error: " + error, { status: 500 });
      }
      const result = value;
      if (result instanceof WorkerResponse) {
        return new Response(result.body, { status: result.status, headers: result.headers });
      }
      if (typeof result === "string") return new Response(result);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" }});
    } catch (err) {
      console.error("Server error:", err);
      return new Response("Server error: " + (err?.message || String(err)), { status: 500 });
    }
  }
});

console.log("Mini Cloudflare Worker runtime (routing) listening: http://localhost:3000");
