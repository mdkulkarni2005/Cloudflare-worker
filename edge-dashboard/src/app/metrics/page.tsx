"use client";

import { useEffect, useState } from "react";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const load = () =>
        fetch("http://localhost:3000/api/metrics")
        .then(res => res.json())
        .then(setMetrics)
        .catch(console.error);
  
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);
  

  if (!metrics) {
    return <p className="text-gray-400">Loading metrics...</p>;
  }

  const workers = metrics.workers || {};

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Metrics</h1>

      <div className="flex gap-6 mb-10">
        <div className="bg-[#181818] p-5 rounded-xl">
          <p className="text-gray-400 text-sm">Total Requests</p>
          <p className="text-2xl font-bold">{metrics.totalRequests}</p>
        </div>

        <div className="bg-[#181818] p-5 rounded-xl">
          <p className="text-gray-400 text-sm">Total Errors</p>
          <p className="text-2xl font-bold text-red-500">
            {metrics.totalErrors}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Workers</h2>

      {Object.keys(workers).length === 0 && (
        <p className="text-gray-500">No worker traffic yet</p>
      )}

      <div className="space-y-4">
        {Object.entries(workers).map(([name, data]: any) => (
          <div
            key={name}
            className="bg-[#181818] p-5 rounded-xl border border-gray-800"
          >
            <p className="font-medium">{name}</p>
            <p className="text-sm text-gray-400">
              Requests: {data.requests} | Errors: {data.errors}
            </p>
            <p className="text-sm text-gray-400">
              Avg Time: {data.avgTime?.toFixed(2)} ms
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
