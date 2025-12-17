#!/usr/bin/env node
import fs from "fs";
import path from "path";

const API = "http://localhost:3000";
const CONFIG = path.join(process.cwd(), "cli", "config.json");

function readConfig() {
  if (!fs.existsSync(CONFIG)) return {};
  return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
}

function saveConfig(data) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2));
}

async function request(url, options = {}) {
  const cfg = readConfig();
  const headers = {
    "Content-Type": "application/json",
    ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(API + url, {
    ...options,
    headers
  });

  if (!res.ok) {
    console.error("Error:", await res.text());
    process.exit(1);
  }

  return res.json().catch(() => res.text());
}

/* ---------------- commands ---------------- */

const cmd = process.argv[2];
const arg = process.argv[3];

if (cmd === "login") {
  console.log("Paste your project token:");
  process.stdin.once("data", (d) => {
    const token = d.toString().trim();
    saveConfig({ token });
    console.log("✔ Logged in");
    process.exit(0);
  });
}

if (cmd === "deploy") {
  if (!arg) {
    console.log("Usage: edge deploy <worker.js>");
    process.exit(1);
  }

  const name = path.basename(arg).replace(".js", "");
  const code = fs.readFileSync(arg, "utf8");

  await request("/api/workers/deploy", {
    method: "POST",
    body: JSON.stringify({ name, code })
  });

  console.log(`✔ Deployed ${name}`);
  process.exit(0);
}

if (cmd === "traffic") {
  const data = await request("/api/traffic");
  console.table(
    data.map((t) => ({
      route: t.route,
      worker: t.worker,
      status: t.status,
      ms: t.duration
    }))
  );
  process.exit(0);
}

if (cmd === "logs") {
  console.log("Live logs (Ctrl+C to exit)");
  const es = new EventSource(API + "/api/inspect/stream");

  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.payload?.worker) {
      console.log(
        `[${msg.payload.worker}] ${msg.payload.route} (${msg.payload.status})`
      );
    }
  };
}

console.log(`
edge <command>

Commands:
  login
  deploy <file>
  traffic
  logs
`);
