"use client";

import { useEffect, useState } from "react";

export function Inspector({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:3000/api/traffic/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  if (!data) return <p>Loading inspector…</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Request Inspector</h2>

      <Section title="Overview">
        <Row label="Method" value={data.method} />
        <Row label="Route" value={data.route} />
        <Row label="Worker" value={data.worker} />
        <Row label="Status" value={data.status} />
        <Row label="Duration" value={`${data.duration} ms`} />
      </Section>

      <Section title="Headers">
        <CodeBlock value={data.request.headers} />
      </Section>

      <Section title="Query">
        <CodeBlock value={data.request.query} />
      </Section>

      <Section title="Request Body">
        <CodeBlock value={data.request.body} />
      </Section>

      <Section title="Response">
        <CodeBlock value={data.response.body} />
      </Section>

      {data.error && (
        <Section title="Error">
          <CodeBlock value={data.error} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="bg-[#181818] rounded-xl p-4 border border-gray-800">
      <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CodeBlock({ value }: any) {
  return (
    <pre className="text-xs bg-black/40 p-3 rounded overflow-auto">
      {typeof value === "string"
        ? value || "(empty)"
        : JSON.stringify(value, null, 2)}
    </pre>
  );
}
