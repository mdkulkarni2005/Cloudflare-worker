import { randomUUID } from "crypto";

const PORT = 3000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const PLANS = {
  free: { requests: 1000, workers: 3, kvKeys: 50, kvValue: 10_000 },
  pro: { requests: 100_000, workers: 20, kvKeys: 1000, kvValue: 100_000 },
  team: {
    requests: 1_000_000,
    workers: 100,
    kvKeys: 10_000,
    kvValue: 1_000_000,
  },
};

const projects = new Map();
const workers = new Map();
const kvStore = new Map();
const trafficStore = [];
const sseClients = new Set();

/* ---------------- helpers ---------------- */

const today = () => new Date().toISOString().slice(0, 10);

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const text = (d, s = 200) => new Response(d, { status: s, headers: CORS });

function broadcast(evt) {
  const msg = `data: ${JSON.stringify(evt)}\n\n`;
  for (const c of sseClients) {
    try {
      c.enqueue(msg);
    } catch {}
  }
}

function recordTraffic(t) {
  trafficStore.unshift(t);
  if (trafficStore.length > 500) trafficStore.pop();
  broadcast({ type: "traffic", payload: t });
}

/* ---------------- auth ---------------- */

function getProject(req) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  return projects.get(auth.replace("Bearer ", "")) || null;
}

function enforceRequests(project) {
  const plan = PLANS[project.plan];
  if (project.usage.day !== today()) {
    project.usage.day = today();
    project.usage.count = 0;
  }
  if (project.usage.count >= plan.requests) return false;
  project.usage.count++;
  return true;
}

/* ---------------- KV ---------------- */

function getKV(project) {
  if (!kvStore.has(project.token)) {
    kvStore.set(project.token, new Map());
  }
  return kvStore.get(project.token);
}

function createKVAPI(project) {
  const plan = PLANS[project.plan];
  const store = getKV(project);

  return {
    get(key) {
      return store.get(key) ?? null;
    },

    put(key, value) {
      const size = new TextEncoder().encode(
        typeof value === "string" ? value : JSON.stringify(value)
      ).length;

      if (!store.has(key) && store.size >= plan.kvKeys) {
        throw new Error("KV key limit exceeded");
      }

      if (size > plan.kvValue) {
        throw new Error("KV value too large");
      }

      store.set(key, value);
    },

    delete(key) {
      store.delete(key);
    },
  };
}

/* ---------------- SSE ---------------- */

function inspectorStream() {
  const stream = new ReadableStream({
    start(ctrl) {
      sseClients.add(ctrl);
      ctrl.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      return () => sseClients.delete(ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS,
    },
  });
}

/* ---------------- server ---------------- */

async function handle(req) {
  const start = Date.now();
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (url.pathname === "/api/inspect/stream") {
    return inspectorStream();
  }

  if (url.pathname === "/api/traffic") {
    return json(trafficStore);
  }

  if (url.pathname === "/api/projects/create") {
    const { name } = await req.json();
    const token = `proj_${randomUUID()}`;

    projects.set(token, {
      token,
      name,
      plan: "free",
      usage: { day: today(), count: 0 },
      workers: new Set(),
    });

    return json({ token });
  }

  // -------------------- GITHUB WEBHOOK --------------------
  if (url.pathname === "/api/webhooks/github") {
    const payload = await req.json();

    const repo = payload?.repository?.full_name;
    const branch = payload?.ref;
    const commit = payload?.after;

    console.log("🔔 GitHub Webhook Received");
    console.log("Repo:", repo);
    console.log("Branch:", branch);
    console.log("Commit:", commit);

    recordTraffic({
      id: crypto.randomUUID(),
      time: Date.now(),
      route: "/api/webhooks/github",
      worker: "github",
      method: "POST",
      status: "ok",
      duration: Date.now() - start,
      request: { body: payload },
      response: { body: "Webhook received" },
      error: null,
    });

    return json({ ok: true });
  }

  const project = getProject(req);
  if (!project) return json({ error: "Unauthorized" }, 401);

  if (!enforceRequests(project)) {
    return json({ error: "Request quota exceeded" }, 429);
  }

  if (url.pathname === "/api/workers/deploy") {
    const { name, code } = await req.json();
    const plan = PLANS[project.plan];

    if (project.workers.size >= plan.workers) {
      return json({ error: "Worker limit exceeded" }, 403);
    }

    workers.set(name, { code, owner: project });
    project.workers.add(name);

    return json({ deployed: name });
  }

  try {
    if (url.pathname === "/hi") {
      const body = await req.text();

      recordTraffic({
        id: randomUUID(),
        route: "/hi",
        worker: "hello",
        method: req.method,
        status: "ok",
        duration: Date.now() - start,
      });

      return text(body || "hi");
    }

    if (url.pathname.startsWith("/todo/")) {
      const id = url.pathname.split("/")[2];

      recordTraffic({
        id: randomUUID(),
        route: `/todo/${id}`,
        worker: "todo",
        method: req.method,
        status: "ok",
        duration: Date.now() - start,
      });

      return text(`Todo ID: ${id}`);
    }
  } catch (e) {
    recordTraffic({
      id: randomUUID(),
      route: url.pathname,
      worker: "unknown",
      method: req.method,
      status: "error",
      duration: Date.now() - start,
      error: e.message,
    });

    return text("Runtime Error", 500);
  }

  return text("404 Not Found", 404);
}

Bun.serve({
  port: PORT,
  idleTimeout: 0,
  fetch: handle,
});

console.log(`🔥 Mini Edge Runtime running at http://localhost:${PORT}`);
