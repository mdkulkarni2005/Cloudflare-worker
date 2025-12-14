"use client";

import { useEffect, useState } from "react";

export default function KVPage() {
  const [kv, setKv] = useState<Record<string, any>>({});
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  // Load KV data
  useEffect(() => {
    fetch("http://localhost:3000/api/kv/list")
      .then(res => res.json())
      .then(setKv);
  }, []);

  async function save() {
    await fetch("http://localhost:3000/api/kv/set", {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "content-type": "application/json" }
    });
    window.location.reload();
  }

  async function remove(k: string) {
    await fetch("http://localhost:3000/api/kv/delete", {
      method: "POST",
      body: JSON.stringify({ key: k }),
      headers: { "content-type": "application/json" }
    });
    window.location.reload();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-10">KV Storage</h1>

      {/* Add / Update KV */}
      <div className="bg-[#181818] border border-gray-800 p-6 rounded-xl mb-10">
        <h2 className="text-xl font-semibold mb-4">Add / Update Key</h2>

        <div className="flex gap-6">
          <input 
            className="bg-[#101010] border border-gray-700 rounded-md px-3 py-2 w-64"
            placeholder="key"
            value={key}
            onChange={e => setKey(e.target.value)}
          />

          <input 
            className="bg-[#101010] border border-gray-700 rounded-md px-3 py-2 w-64"
            placeholder="value"
            value={value}
            onChange={e => setValue(e.target.value)}
          />

          <button
            onClick={save}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Save
          </button>
        </div>
      </div>

      {/* KV List */}
      <h2 className="text-2xl font-semibold mb-4">Stored Keys</h2>

      <div className="space-y-4">
        {Object.entries(kv).map(([k, v]) => (
          <div 
            key={k}
            className="bg-[#181818] border border-gray-800 p-5 rounded-xl flex justify-between"
          >
            <div>
              <p className="text-lg">{k}</p>
              <p className="text-gray-500">{String(v)}</p>
            </div>

            <button
              onClick={() => remove(k)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
