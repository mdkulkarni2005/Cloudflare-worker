import crypto from "crypto";
import { spawn } from "child_process";

/* ===============================
   CONFIG
================================ */

const PORT = 3000;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "dev-secret";

/* ===============================
   IN-MEMORY TRAFFIC STORE
================================ */

const trafficStore = new Map();

/* ===============================
   HELPERS
================================ */

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function text(data, status = 200) {
  return new Response(data, { status });
}

function timing(start) {
  return Date.now() - start;
}

function verifyGitHubSignature(req, body) {
  const sig256 = req.headers.get("x-hub-signature-256");
  if (!sig256) return false;

  const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
  const digest = "sha256=" + hmac.update(body).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(sig256),
    Buffer.from(digest)
  );
}

function recordTraffic(event) {
  trafficStore.set(event.id, event);
}

/* ===============================
   AUTO DEPLOY
================================ */

function autoDeploy() {
  console.log("🚀 Auto deploy triggered");

  const git = spawn("git", ["pull"], { stdio: "inherit" });

  git.on("close", (code) => {
    if (code === 0) {
      console.log("✅ Code updated successfully");
      console.log("♻️  Restart server manually for now");
    } else {
      console.log("❌ Git pull failed");
    }
  });
}

/* ===============================
   MAIN FETCH HANDLER
================================ */

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const start = Date.now();
    const url = new URL(req.url);
    const id = crypto.randomUUID();

    /* ===============================
       LIST ALL TRAFFIC
    ================================ */
    if (url.pathname === "/api/traffic") {
      return json(Array.from(trafficStore.values()));
    }

    /* ===============================
       INSPECT SINGLE TRAFFIC EVENT
    ================================ */
    if (url.pathname.startsWith("/api/traffic/")) {
      const eventId = url.pathname.split("/").pop();
      const event = trafficStore.get(eventId);

      if (!event) {
        return json({ error: "Request not found" }, 404);
      }

      return json(event);
    }

    /* ===============================
       GITHUB WEBHOOK
    ================================ */
    if (url.pathname === "/api/webhooks/github" && req.method === "POST") {
      const body = await req.text();

      const valid = verifyGitHubSignature(req, body);

      const payload = JSON.parse(body);

      const event = {
        id,
        time: Date.now(),
        route: url.pathname,
        worker: "github",
        method: "POST",
        status: valid ? "ok" : "error",
        duration: timing(start),
        system: true,
        request: {
          headers: Object.fromEntries(req.headers),
          body,
        },
        response: {
          body: valid ? "Webhook accepted" : "Invalid signature",
        },
        error: valid ? null : "Invalid GitHub signature",
      };

      recordTraffic(event);

      if (!valid) {
        return json({ error: "Unauthorized" }, 401);
      }

      console.log("📦 GitHub Webhook received");
      console.log("Repo:", payload.repository?.full_name);
      console.log("Branch:", payload.ref);

      autoDeploy();

      return json({ ok: true });
    }

    /* ===============================
       FALLBACK
    ================================ */
    return text("Not Found", 404);
  },
});

/* ===============================
   BOOT LOG
================================ */

console.log(`🔥 Mini Edge Runtime running at http://localhost:${PORT}`);
