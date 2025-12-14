"use client";

import { useEffect, useState } from "react";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [path, setPath] = useState("");
  const [worker, setWorker] = useState("");
  const [workers, setWorkers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch existing workers + routes
  useEffect(() => {
    async function fetchData() {
      const resRoutes = await fetch("/api/routes/list");
      const routesJson = await resRoutes.json();
      setRoutes(routesJson);

      const resWorkers = await fetch("/api/workers/list");
      const workerList = await resWorkers.json();
      setWorkers(workerList);

      setLoading(false);
    }
    fetchData();
  }, []);

  async function addRoute() {
    if (!path.trim()) return alert("Route path cannot be empty.");
    if (!worker.trim()) return alert("Please select a worker.");
  
    await fetch("/api/routes/add", {
      method: "POST",
      body: JSON.stringify({ path, worker }),
      headers: { "content-type": "application/json" },
    });
  
    window.location.reload();
  }
  
  

  async function deleteRoute(routePath: string) {
    await fetch("/api/routes/delete", {
      method: "POST",
      body: JSON.stringify({ route: routePath }), // FIXED: route instead of path
      headers: { "content-type": "application/json" },
    });
    window.location.reload();
  }
  

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-10">Routes</h1>

      {/* Add Route Form */}
      <div className="bg-[#181818] border border-gray-800 p-6 rounded-xl mb-10">
        <h2 className="text-xl font-semibold mb-4">Add New Route</h2>

        <div className="flex gap-6 items-end">
          <div className="flex flex-col">
            <label className="text-gray-400 text-sm mb-1">Route Path</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/user"
              className="bg-[#101010] border border-gray-700 rounded-md px-3 py-2 w-64"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-400 text-sm mb-1">Worker</label>
            <select
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              className="bg-[#101010] border border-gray-700 rounded-md px-3 py-2 w-64"
            >
              <option value="">Select Worker</option>
              {workers.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <button
            onClick={addRoute}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
          >
            Add Route
          </button>
        </div>
      </div>

      {/* Existing Routes */}
      <h2 className="text-2xl font-semibold mb-4">Existing Routes</h2>

      <div className="space-y-4">
        {Object.entries(routes).map(([routePath, workerName]) => (
          <div
            key={routePath}
            className="bg-[#181818] border border-gray-800 p-5 rounded-xl flex justify-between items-center"
          >
            <div>
              <p className="text-lg font-medium">{routePath}</p>
              <p className="text-gray-500 text-sm">→ {workerName}.js</p>
            </div>

            <button
              onClick={() => deleteRoute(routePath)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
