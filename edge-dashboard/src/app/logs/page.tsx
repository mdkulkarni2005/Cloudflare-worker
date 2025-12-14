"use client";

import { useEffect, useState } from "react";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);

  async function loadLogs() {
    const res = await fetch("/api/logs/list");
    const json = await res.json();
    setLogs(json);
  }

  // Auto-refresh every 1.5 seconds
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Worker Logs</h1>

      <div className="bg-[#111] border border-gray-800 rounded-xl p-6 h-[70vh] overflow-auto font-mono text-sm">
        {logs.map((log: any, i) => (
          <div key={i} className="mb-1">
            <span className="text-gray-500 mr-2">
              {new Date(log.time).toLocaleTimeString()}
            </span>
            <span
              className={
                log.type === "error"
                  ? "text-red-400"
                  : "text-green-300"
              }
            >
              {log.message}
            </span>
          </div>
        ))}

        {logs.length === 0 && (
          <p className="text-gray-500">No logs yet...</p>
        )}
      </div>
    </div>
  );
}
