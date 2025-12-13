"use client";

import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";

export default function WorkerEditor({ params }: any) {
  const name = params.name;
  const [code, setCode] = useState("// loading...");

  useEffect(() => {
    fetch("http://localhost:3000/api/workers/get?name=" + name)
      .then((res) => res.text())
      .then(setCode);
  }, [name]);

  function deploy() {
    fetch("http://localhost:3000/api/workers/deploy", {
      method: "POST",
      body: JSON.stringify({ name, code }),
      headers: { "content-type": "application/json" }
    }).then(() => alert("Deployed!"));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{name}.js</h1>

      <button onClick={deploy} className="px-4 py-2 bg-green-600 text-white rounded mb-3">
        Deploy
      </button>

      <Editor
        height="70vh"
        defaultLanguage="javascript"
        value={code}
        onChange={(v) => setCode(v || "")}
      />
    </div>
  );
}
