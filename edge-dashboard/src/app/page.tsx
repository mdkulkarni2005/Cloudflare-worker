export default async function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Mini Edge Platform</h1>
      <p className="text-gray-600 mt-2">
        Welcome! Build, deploy, and manage edge workers like Cloudflare 🚀
      </p>

      <div className="grid grid-cols-3 gap-6 mt-10">
        <DashboardCard title="Workers" description="Manage all workers" link="/workers" />
        <DashboardCard title="Routes" description="Configure URL → Worker mapping" link="/routes" />
        <DashboardCard title="KV Storage" description="View stored data" link="/kv" />
      </div>
    </div>
  );
}

function DashboardCard({ title, description, link }: any) {
  return (
    <a href={link} className="p-6 bg-white shadow rounded-lg hover:shadow-lg transition">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-gray-500">{description}</p>
    </a>
  );
}
