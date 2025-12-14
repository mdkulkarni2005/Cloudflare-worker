export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        Mini Edge Platform
      </h1>

      <p className="text-gray-400 mt-2 text-lg">
        Build, deploy, and manage edge workers — just like Cloudflare, but yours 😎
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">

        <DashboardCard
          title="Workers"
          description="Create, edit, and deploy edge workers"
          link="/workers"
        />

        <DashboardCard
          title="Routes"
          description="Configure URL routing → workers"
          link="/routes"
        />

        <DashboardCard
          title="KV Storage"
          description="View and manage key-value data"
          link="/kv"
        />

      </div>
    </div>
  );
}

function DashboardCard({ title, description, link }: any) {
  return (
    <a
      href={link}
      className="
        bg-[#1a1a1a] rounded-xl p-6 shadow-lg border border-gray-800
        hover:border-purple-500 hover:shadow-purple-500/20 
        transition-all duration-200 
      "
    >
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-gray-400 mt-2">{description}</p>
    </a>
  );
}
