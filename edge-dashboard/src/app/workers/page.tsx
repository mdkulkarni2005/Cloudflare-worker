"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Worker = {
  name: string;
  requests?: number;
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [workerName, setWorkerName] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:3000/api/workers/list")
      .then(res => res.json())
      .then(data => setWorkers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function createWorker() {
    if (!workerName.trim()) return;

    await fetch("http://localhost:3000/api/workers/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: workerName, code: "// worker code" })
    });

    setShowModal(false);
    router.refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Workers</h1>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 rounded-lg text-white"
        >
          + New Worker
        </button>
      </div>

      <div className="space-y-4">
        {workers.map((w) => (
          <div
            key={w.name}
            onClick={() => router.push("/workers/" + w.name)}
            className="cursor-pointer bg-[#181818] border border-gray-800 p-4 rounded-lg hover:border-blue-500"
          >
            <div className="font-semibold">{w.name}</div>
            <div className="text-sm text-gray-400">
              Requests: {w.requests ?? 0}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 w-[420px]">
            <h2 className="text-xl font-semibold mb-4">Create Worker</h2>

            <input
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-700 rounded-md px-3 py-2 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={createWorker}
                className="px-4 py-2 bg-purple-600 text-white rounded-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
