"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [workerName, setWorkerName] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:3000/api/workers/list")
      .then(res => res.json())
      .then(setWorkers)
      .finally(() => setLoading(false));
  }, []);

  async function createWorker() {
    if (!workerName.trim()) return;

    const code = `
globalThis.handle = async (req, body) => {
  return "Hello from ${workerName}";
};
`.trim();

    await fetch("http://localhost:3000/api/workers/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: workerName, code })
    });

    setShowModal(false);
    router.push("/workers/" + workerName);
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workers</h1>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
        >
          + New Worker
        </button>
      </div>

      <div className="space-y-4">
        {workers.map(w => (
          <div
            key={w}
            onClick={() => router.push("/workers/" + w)}
            className="cursor-pointer bg-[#181818] border border-gray-800 p-4 rounded-lg hover:border-blue-500 transition"
          >
            {w}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#141414] border border-gray-800 rounded-xl w-[420px] p-6">
            <h2 className="text-xl font-semibold mb-4">Create Worker</h2>

            <input
              autoFocus
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              placeholder="worker-name"
              className="w-full bg-[#0f0f0f] border border-gray-700 rounded-md px-3 py-2 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setWorkerName("");
                }}
                className="px-4 py-2 bg-gray-700 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={createWorker}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white"
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
