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
    const id = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3000/__logs");
        const data = await res.json();
        setLogs(data);
      } catch {}
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Logs</h1>

      <div className="bg-black border border-gray-800 rounded-xl p-4 h-[70vh] overflow-auto font-mono text-sm">
        {logs.length === 0 && (
          <p className="text-gray-500">No logs yet</p>
        )}

        {logs.map((log, i) => (
          <div
            key={i}
            className={
              log.type === "error"
                ? "text-red-400 mb-1"
                : "text-gray-300 mb-1"
            }
          >
            [{new Date(log.time).toLocaleTimeString()}] {log.message}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
