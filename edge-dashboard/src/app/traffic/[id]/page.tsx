"use client";

import { useEffect, useState } from "react";

export default function Inspector({ params }: any) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/traffic/${params.id}`)
      .then(r => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Request Inspector</h1>

      <Section title="Summary">
        <KV k="Route" v={data.route} />
        <KV k="Worker" v={data.worker} />
        <KV k="Method" v={data.method} />
        <KV k="Status" v={data.status} />
        <KV k="Duration" v={`${data.duration} ms`} />
      </Section>

      <Section title="Headers">
        <pre>{JSON.stringify(data.request.headers, null, 2)}</pre>
      </Section>

      <Section title="Query Params">
        <pre>{JSON.stringify(data.request.query, null, 2)}</pre>
      </Section>

      <Section title="Request Body">
        <pre>{data.request.body || "—"}</pre>
      </Section>

      <Section title="Response">
        <pre>{data.response.body}</pre>
      </Section>

      {data.error && (
        <Section title="Error">
          <pre className="text-red-400">{data.error}</pre>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="bg-[#151515] border border-gray-800 rounded-xl p-5">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function KV({ k, v }: any) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="text-gray-400 w-32">{k}</span>
      <span>{String(v)}</span>
    </div>
  );
}
