// server.js
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { execSync } from "child_process";

/* ---------------- CONFIG ---------------- */

const PORT = 3000;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "dev-secret";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* ---------------- STATE ---------------- */

const trafficStore = [];
const sseClients = new Set();

/* ---------------- HELPERS ---------------- */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function text(data, status = 200) {
  return new Response(data, { status, headers: CORS });
}

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.enqueue(payload);
    } catch {}
  }
}

function recordTraffic(entry) {
  trafficStore.unshift(entry);
  if (trafficStore.length > 500) trafficStore.pop();
  broadcast({ type: "traffic", payload: entry });
}

/* ---------------- GITHUB SIGNATURE ---------------- */

function verifyGithubSignature(rawBody, signature) {
  if (!signature) return false;

  const hmac = createHmac("sha256", GITHUB_SECRET);
  const digest = `sha256=${hmac.update(rawBody).digest("hex")}`;

  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

/* ---------------- SSE ---------------- */

function startInspectorSSE() {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller);
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      return () => sseClients.delete(controller);
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

/* ---------------- ROUTER ---------------- */

async function handleRequest(req) {
  const start = Date.now();
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  /* ---- SYSTEM ROUTES ---- */

  if (url.pathname === "/api/inspect/stream") {
    return startInspectorSSE();
  }

  if (url.pathname === "/api/traffic") {
    return json(trafficStore);
  }

  // 🔍 INSPECT SINGLE TRAFFIC EVENT
  app.get("/api/traffic/:id", (req, res) => {
    const { id } = req.params;

    const event = trafficStore.get(id);

    if (!event) {
      return res.status(404).json({
        error: "Request not found",
      });
    }

    res.json(event);
  });

  /* ---- GITHUB WEBHOOK ---- */

  if (url.pathname === "/api/webhooks/github") {
    const rawBody = await req.text();
    const event = req.headers.get("x-github-event");
    const signature = req.headers.get("x-hub-signature-256");

    // Allow ping without signature failure
    if (event !== "ping") {
      const valid = verifyGithubSignature(rawBody, signature);
      if (!valid) {
        recordTraffic({
          id: randomUUID(),
          route: url.pathname,
          worker: "github",
          method: req.method,
          status: "ok", // IMPORTANT
          system: true,
          duration: Date.now() - start,
          response: { note: "Invalid signature ignored" },
        });
        return json({ ok: true });
      }
    }

    // Auto-deploy on push
    if (event === "push") {
      try {
        execSync("git pull origin main", { stdio: "ignore" });
      } catch {}
    }

    recordTraffic({
      id: randomUUID(),
      route: url.pathname,
      worker: "github",
      method: req.method,
      status: "ok",
      system: true,
      duration: Date.now() - start,
      response: { event },
    });

    return json({ ok: true });
  }

  /* ---- WORKER ROUTES ---- */

  if (url.pathname === "/hi") {
    const body = await req.text();

    recordTraffic({
      id: randomUUID(),
      route: "/hi",
      worker: "hello",
      method: req.method,
      status: "ok",
      duration: Date.now() - start,
      request: { body },
      response: { body },
    });

    return text(body || "hi");
  }

  return text("Not Found", 404);
}

/* ---------------- SERVER ---------------- */

Bun.serve({
  port: PORT,
  idleTimeout: 0,
  fetch: handleRequest,
});

console.log(`🔥 Mini Edge Runtime running at http://localhost:${PORT}`);
