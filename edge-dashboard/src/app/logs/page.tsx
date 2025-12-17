"use client";

import { useEffect, useRef, useState } from "react";

type Log = {
  type: "log" | "error";
  message: string;
  time: number;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("http://localhost:3000/api/logs/stream");

    es.onmessage = (e) => {
      const log: Log = JSON.parse(e.data);
      setLogs((prev) => [...prev, log]);
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Live Logs</h1>

      <div className="bg-black border border-gray-800 rounded-xl p-4 h-[70vh] overflow-y-auto font-mono text-sm">
        {logs.map((l, i) => (
          <div key={i} className={l.type === "error" ? "text-red-400" : "text-gray-200"}>
            [{new Date(l.time).toLocaleTimeString()}] {l.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
