import crypto from "crypto";
import { execSync } from "child_process";

const trafficStore = new Map();

/* ------------------ HELPERS ------------------ */

function json(res, data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function logTraffic(entry) {
  trafficStore.set(entry.id, entry);
}

/* ------------------ SERVER ------------------ */

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const start = Date.now();
    const id = crypto.randomUUID();

    /* ---------- GITHUB WEBHOOK ---------- */
    if (url.pathname === "/api/webhooks/github" && req.method === "POST") {
      const body = await req.text();

      logTraffic({
        id,
        time: Date.now(),
        route: url.pathname,
        method: req.method,
        worker: "github",
        duration: Date.now() - start,
        status: "ok",
        system: true,
        request: {
          headers: Object.fromEntries(req.headers),
          body,
        },
        response: { body: "OK" },
      });

      // OPTIONAL auto deploy
      try {
        execSync("git pull", { stdio: "ignore" });
      } catch {}

      return json(null, { ok: true });
    }

    /* ---------- LIST TRAFFIC ---------- */
    if (url.pathname === "/api/traffic" && req.method === "GET") {
      return json(
        null,
        Array.from(trafficStore.values()).sort(
          (a, b) => b.time - a.time
        )
      );
    }

    /* ---------- SINGLE INSPECT ---------- */
    if (url.pathname.startsWith("/api/traffic/")) {
      const id = url.pathname.split("/").pop();
      const item = trafficStore.get(id);

      if (!item) {
        return json(null, { error: "Not found" }, 404);
      }

      return json(null, item);
    }

    /* ---------- DEFAULT ---------- */
    logTraffic({
      id,
      time: Date.now(),
      route: url.pathname,
      method: req.method,
      worker: "unknown",
      duration: Date.now() - start,
      status: "error",
      error: "Route not found",
    });

    return json(null, { error: "Route not found" }, 404);
  },
};

console.log("🔥 Mini Edge Runtime running at http://localhost:3000");
