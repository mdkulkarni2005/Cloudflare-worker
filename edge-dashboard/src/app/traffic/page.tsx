"use client";

import { useEffect, useState } from "react";
import { Inspector } from "@/components/Inspector";

type TrafficItem = {
  id: string;
  route: string;
  worker: string;
  method: string;
  status: "ok" | "error";
  duration: number;
};

export default function TrafficPage() {
  const [items, setItems] = useState<TrafficItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/traffic");
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      }
    };

    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  const filteredItems = items.filter(
    (item) => filter === "all" || item.worker === filter
  );

  return (
    <div className="flex h-full">
      {/* LEFT */}
      <div className="w-1/2 pr-4 border-r border-gray-800">
        <h1 className="text-2xl font-bold mb-4">Traffic</h1>

        <div className="flex gap-2 mb-4">
          {["all", "todo", "hello"].map((w) => (
            <button
              key={w}
              onClick={() => setFilter(w)}
              className={`px-3 py-1 rounded text-sm ${
                filter === w
                  ? "bg-blue-600 text-white"
                  : "bg-[#181818] text-gray-400 hover:bg-gray-700"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={`p-4 rounded mb-2 cursor-pointer border transition ${
              selectedId === item.id
                ? "bg-gray-800 border-blue-500"
                : "bg-[#181818] border-gray-700 hover:bg-gray-800"
            }`}
          >
            <div className="flex justify-between">
              <span className="font-mono">
                {item.method} {item.route}
              </span>
              <span
                className={
                  item.status === "ok"
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {item.status}
              </span>
            </div>

            <div className="text-sm text-gray-400">
              {item.worker} • {item.duration}ms
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT */}
      <div className="w-1/2 pl-4">
        {selectedId ? (
          <Inspector id={selectedId} />
        ) : (
          <p className="text-gray-500 mt-10">
            Select a request to inspect
          </p>
        )}
      </div>
    </div>
  );
}
