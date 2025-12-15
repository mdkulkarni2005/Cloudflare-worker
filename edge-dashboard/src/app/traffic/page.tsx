"use client";

import { useEffect, useState } from "react";
import { Inspector } from "@/components/Inspector";

type TrafficEntry = {
  id: string;
  time: number;
  route: string;
  worker: string;
  method: string;
  status: "ok" | "error";
  duration: number;
};

export default function TrafficPage() {
  const [traffic, setTraffic] = useState<TrafficEntry[]>([]);
  const [selected, setSelected] = useState<TrafficEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("http://localhost:3000/api/traffic");
      const data = await res.json();
      setTraffic(data);
    };

    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full">
      {/* Traffic List */}
      <div className="w-1/2 border-r border-gray-800 p-6">
        <h1 className="text-2xl font-bold mb-4">Traffic</h1>

        <div className="space-y-2">
          {traffic.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left p-4 rounded-lg bg-[#181818] hover:bg-[#202020] transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {t.method} {t.route}
                  </p>
                  <p className="text-sm text-gray-400">
                    {t.worker} • {t.duration}ms
                  </p>
                </div>

                <span
                  className={`text-sm px-2 py-1 rounded ${
                    t.status === "ok"
                      ? "bg-green-600/20 text-green-400"
                      : "bg-red-600/20 text-red-400"
                  }`}
                >
                  {t.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Inspector */}
      <div className="w-1/2 p-6">
        {selected ? (
          <Inspector id={selected.id} />
        ) : (
          <p className="text-gray-500">Select a request to inspect</p>
        )}
      </div>
    </div>
  );
}
