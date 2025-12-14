"use client";

import Editor from "@monaco-editor/react";
import React, { useState, useEffect } from "react";

export default function WorkerEditor({ params }: any) {
  // ✅ FIX: unwrap params using React.use()
  const { name } = React.use(params);

  const [code, setCode] = useState("// loading worker...");
  const [loading, setLoading] = useState(true);

  // -------------------------
  // LOAD WORKER FILE CONTENT
  // -------------------------
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://localhost:3000/api/workers/get?name=${name}`);
        const text = await res.text();
        setCode(text);
      } catch (err) {
        console.error("Failed to fetch worker:", err);
        setCode("// Failed to load worker");
      }
      setLoading(false);
    }

    load();
  }, [name]);

  // -------------------------
  // DEPLOY WORKER
  // -------------------------
  async function deploy() {
    await fetch("http://localhost:3000/api/workers/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });

    alert("Deployed!");
  }

  if (loading) return <p className="text-gray-400">Loading worker...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{name}.js</h1>

      <button
        onClick={deploy}
        className="px-4 py-2 bg-green-600 text-white rounded mb-3"
      >
        Deploy
      </button>

      <Editor
        height="70vh"
        defaultLanguage="javascript"
        value={code}
        onChange={(value) => setCode(value ?? "")}
      />
    </div>
  );
}
