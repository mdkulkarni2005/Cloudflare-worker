export default async function WorkersPage() {
  const res = await fetch("http://localhost:3000/api/workers/list");
  const workers = await res.json();

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workers</h1>

        <a href="/workers/new" 
           className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition">
          + New Worker
        </a>
      </div>

      <ul className="mt-8 space-y-4">
        {workers.map((w: any) => (
          <li
            key={w}
            className="
              p-5 bg-[#1a1a1a] rounded-xl border border-gray-800
              hover:border-blue-500 hover:shadow-blue-500/20 
              transition-all duration-200
            "
          >
            <a href={`/workers/${w}`} className="text-lg font-semibold">
              {w}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
