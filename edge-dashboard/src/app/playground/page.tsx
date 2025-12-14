"use client";

import { useEffect, useState } from "react";

export default function PlaygroundPage() {
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [route, setRoute] = useState("");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [output, setOutput] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/routes/list")
      .then((r) => r.json())
      .then(setRoutes);
  }, []);

  async function run() {
    if (!route) return alert("Select a route");

    setRunning(true);
    setOutput("");

    const res = await fetch("http://localhost:3000/__run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        route,
        method,
        body
      })
    });

    const text = await res.text();
    setOutput(text);
    setRunning(false);
  }

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("http://localhost:3000/__logs");
      const data = await res.json();
      setLogs(data.map((l: any) => `[${l.type}] ${l.message}`));
    }, 1500);

    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Playground</h1>

      <div className="bg-[#181818] border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex gap-4 mb-4">
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="bg-[#101010] border border-gray-700 rounded px-3 py-2"
          >
            <option value="">Select route</option>
            {Object.keys(routes).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-[#101010] border border-gray-700 rounded px-3 py-2"
          >
            <option>GET</option>
            <option>POST</option>
          </select>

          <button
            onClick={run}
            disabled={running}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Request body"
          className="w-full h-32 bg-[#101010] border border-gray-700 rounded p-3 mb-4"
        />

        <div className="bg-black border border-gray-700 rounded p-4 text-green-400 whitespace-pre-wrap">
          {output || "Output will appear here"}
        </div>
      </div>

      <div className="bg-[#181818] border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Logs</h2>

        <div className="bg-black rounded p-4 text-sm h-64 overflow-auto">
          {logs.length === 0 && <p className="text-gray-500">No logs yet</p>}
          {logs.map((l, i) => (
            <div key={i} className="mb-1">{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
