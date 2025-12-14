"use client";

import { useEffect, useState } from "react";

export default function Playground() {
  const [routes, setRoutes] = useState<string[]>([]);
  const [route, setRoute] = useState("");
  const [method, setMethod] = useState("POST");
  const [body, setBody] = useState("");
  const [output, setOutput] = useState("");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/routes/list");
      const json = await res.json();
      setRoutes(Object.keys(json));
    }
    load();
  }, []);

  async function runWorker() {
    if (!route) return alert("Select a route");

    const res = await fetch("http://localhost:3000/__run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        route,
        method,
        body,
      }),
    });

    const txt = await res.text();
    setOutput(txt);

    const logRes = await fetch("http://localhost:3000/__logs");
    setLogs(await logRes.json());
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Worker Playground</h1>

      <div className="bg-[#181818] p-6 rounded-xl border border-gray-800">
        {/* Route selector */}
        <div className="flex gap-4 mb-4">
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="bg-black border border-gray-700 px-3 py-2 rounded-md"
          >
            <option value="">Select Route</option>
            {routes.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-black border border-gray-700 px-3 py-2 rounded-md"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </div>

        {/* Body */}
        <textarea
          placeholder="Request body..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="bg-black border border-gray-700 w-full h-40 p-3 rounded-md mb-4"
        />

        <button
          onClick={runWorker}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Run
        </button>
      </div>

      {/* Output */}
      <h2 className="text-xl font-semibold mt-10 mb-2">Output</h2>
      <pre className="bg-black border border-gray-800 p-4 rounded-lg h-20 overflow-auto">
        {output || "No output yet."}
      </pre>

      {/* Logs */}
      <h2 className="text-xl font-semibold mt-10 mb-2">Logs</h2>
      <div className="bg-black border border-gray-800 p-4 rounded-lg h-60 overflow-auto">
        {logs.map((log, i) => (
          <p key={i} className={log.type === "error" ? "text-red-400" : "text-gray-300"}>
            {new Date(log.time).toLocaleTimeString()} — {log.message}
          </p>
        ))}
      </div>
    </div>
  );
}
