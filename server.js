// server.js
import { randomUUID } from "crypto";
import crypto from "crypto";

/* -------------------- CONFIG -------------------- */

const PORT = 3000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* -------------------- STATE -------------------- */

// Traffic store for inspector
const trafficStore = [];
const sseClients = new Set();

/* -------------------- HELPERS -------------------- */

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

/* -------------------- GITHUB SIGNATURE VERIFY -------------------- */

function verifyGitHubSignature(req, rawBody) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = `sha256=${hmac}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/* -------------------- SSE -------------------- */

function startInspectorSSE() {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller);
      controller.enqueue(
        `data: ${JSON.stringify({ type: "connected" })}\n\n`
      );
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

/* -------------------- ROUTER -------------------- */

async function handleRequest(req) {
  const start = Date.now();
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  /* -------- INSPECTOR ROUTES (NO AUTH, NO ERROR) -------- */

  if (url.pathname === "/api/inspect/stream") {
    return startInspectorSSE();
  }

  if (url.pathname === "/api/traffic") {
    return json(trafficStore);
  }

  /* -------- GITHUB WEBHOOK -------- */

  if (url.pathname === "/api/webhooks/github" && req.method === "POST") {
    const rawBody = await req.text();

    const valid = verifyGitHubSignature(req, rawBody);

    if (!valid) {
      recordTraffic({
        id: randomUUID(),
        time: Date.now(),
        route: "/api/webhooks/github",
        worker: "github",
        method: "POST",
        status: "error",
        duration: Date.now() - start,
        request: {},
        response: {},
        error: "Invalid signature",
      });

      return text("Invalid signature", 401);
    }

    const payload = JSON.parse(rawBody);

    console.log("✅ GitHub Webhook received");
    console.log("Repo:", payload.repository?.full_name);
    console.log("Branch:", payload.ref);

    recordTraffic({
      id: randomUUID(),
      time: Date.now(),
      route: "/api/webhooks/github",
      worker: "github",
      method: "POST",
      status: "ok",
      duration: Date.now() - start,
      request: {},
      response: {},
      error: null,
    });

    return json({ ok: true });
  }

  /* -------- FALLBACK -------- */

  return text("Not Found", 404);
}

/* -------------------- SERVER -------------------- */

Bun.serve({
  port: PORT,
  idleTimeout: 0,
  fetch: handleRequest,
});

console.log(`🔥 Mini Edge Runtime running at http://localhost:${PORT}`);
