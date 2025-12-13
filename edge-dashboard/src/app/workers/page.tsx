export default async function WorkersPage() {
    const res = await fetch("http://localhost:3000/api/workers/list");
    const workers = await res.json();
  
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Workers</h1>
  
        <a href="/workers/new" className="px-4 py-2 bg-black text-white rounded">
          + New Worker
        </a>
  
        <ul className="mt-6 space-y-4">
          {workers.map((w: any) => (
            <li key={w} className="p-4 bg-white shadow rounded">
              <a href={`/workers/${w}`} className="text-lg font-semibold">
                {w}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  