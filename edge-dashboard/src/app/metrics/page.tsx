"use client";

import { useEffect, useState } from "react";

type Metric = {
  requests: number;
  errors: number;
  totalTime: number;
  lastRequest: number | null;
};

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Record<string, Metric>>({});
  const [loading, setLoading] = useState(true);

  async function loadMetrics() {
    try {
      const res = await fetch("http://localhost:3000/api/metrics");
      const data = await res.json();
      setMetrics(data || {});
    } catch {
      // ignore temporary network errors
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
    const id = setInterval(loadMetrics, 3000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <p className="text-gray-400">Loading metrics...</p>;
  }

  const workers = Object.keys(metrics);

  if (workers.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Metrics</h1>
        <p className="text-gray-500">No traffic yet</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Metrics</h1>

      <div className="space-y-4">
        {workers.map(worker => {
          const m = metrics[worker];
          const avg =
            m.requests > 0 ? Math.round(m.totalTime / m.requests) : 0;

          return (
            <div
              key={worker}
              className="bg-[#181818] border border-gray-800 p-5 rounded-xl"
            >
              <h2 className="text-xl font-semibold mb-3">{worker}</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <p>Requests: <span className="text-white">{m.requests}</span></p>
                <p>Errors: <span className="text-red-400">{m.errors}</span></p>
                <p>Avg Time: <span className="text-white">{avg} ms</span></p>
                <p>
                  Last Request:{" "}
                  <span className="text-white">
                    {m.lastRequest
                      ? new Date(m.lastRequest).toLocaleTimeString()
                      : "-"}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
