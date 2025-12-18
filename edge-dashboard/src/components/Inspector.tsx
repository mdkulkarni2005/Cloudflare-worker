"use client";

import { useEffect, useState } from "react";

type InspectData = {
  id: string;
  time: number;
  route: string;
  worker: string;
  method: string;
  status: "ok" | "error";
  duration: number;
  system?: boolean; // ← ADD THIS
  request?: any;
  response?: any;
  error?: string | null;
};


export function Inspector({ id }: { id: string }) {
  const [data, setData] = useState<InspectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    fetch(`http://localhost:3000/api/traffic/${id}`)
      .then((res) => res.json())
      .then((json) => {
        // 👇 AUTO-DETECT SYSTEM ROUTES
        const isSystem =
          json.route?.startsWith("/api/") ||
          json.worker === "github" ||
          json.worker === "system";

        setData({ ...json, system: isSystem });
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <p className="text-gray-500">Loading inspector…</p>;
  }

  if (!data) {
    return <p className="text-gray-500">Request not found</p>;
  }

  const req = data.request ?? {};
  const res = data.response ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">
          {data.method} {data.route}
        </h2>
        <p className="text-sm text-gray-400">
          Worker: {data.worker} • {data.duration}ms •{" "}
          <span
            className={
              data.status === "ok" ? "text-green-400" : "text-red-400"
            }
          >
            {data.status}
          </span>
        </p>
      </div>

      {/* SYSTEM EVENT (NO RED ERROR) */}
      {data.system && (
        <div className="bg-gray-800 text-gray-400 p-4 rounded border border-gray-700">
          <div className="text-sm font-semibold">System Event</div>
          <div className="text-xs mt-1">
            This request was handled internally (webhook / platform route)
          </div>
        </div>
      )}

      {/* REAL ERROR (ONLY FOR USER WORKERS) */}
      {!data.system && data.error && (
        <div className="bg-red-900 text-red-300 p-4 rounded border border-red-700">
          {data.error}
        </div>
      )}

      {/* REQUEST + RESPONSE (HIDE FOR SYSTEM) */}
      {!data.system && (
        <>
          {/* Request */}
          <div className="bg-[#181818] p-4 rounded border border-gray-800">
            <h3 className="font-semibold mb-2">Request</h3>

            <p className="text-sm text-gray-400 mb-1">Headers</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(req.headers ?? {}, null, 2)}
            </pre>

            <p className="text-sm text-gray-400 mt-4 mb-1">Query</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(req.query ?? {}, null, 2)}
            </pre>

            <p className="text-sm text-gray-400 mt-4 mb-1">Body</p>
            <pre className="text-xs overflow-auto">{req.body || "—"}</pre>
          </div>

          {/* Response */}
          <div className="bg-[#181818] p-4 rounded border border-gray-800">
            <h3 className="font-semibold mb-2">Response</h3>
            <pre className="text-xs overflow-auto">{res.body || "—"}</pre>
          </div>
        </>
      )}
    </div>
  );
}
