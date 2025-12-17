import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";
import "@fontsource/inter";
import { InspectorProvider } from "@/providers/InspectorProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0e0e0e] text-gray-200 flex h-screen">
        {/* SIDEBAR */}
        <aside className="w-64 bg-[#131313] border-r border-gray-800 p-6 flex flex-col fixed h-full shadow-lg">
          <h1 className="text-2xl font-bold mb-10 bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Mini Edge
          </h1>

          <nav className="flex flex-col gap-3 text-gray-400">
            <NavItem name="Dashboard" href="/" />
            <NavItem name="Workers" href="/workers" />
            <NavItem name="Routes" href="/routes" />
            <NavItem name="KV Storage" href="/kv" />
            <NavItem name="Logs" href="/logs" />
            <NavItem name="Playground" href="/playground" />
            <NavItem name="Metrics" href="/metrics" />
            <NavItem name="Traffic" href="/traffic" />
          </nav>

          <footer className="mt-auto text-sm text-gray-500">
            <p>v0.1 • Edge Runtime</p>
          </footer>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 ml-64 p-12 overflow-auto">
          <InspectorProvider>{children}</InspectorProvider>
        </main>
      </body>
    </html>
  );
}

function NavItem({ name, href }: any) {
  return (
    <Link
      href={href}
      className="
        px-3 py-2 rounded-md 
        hover:bg-gray-800 hover:text-white 
        transition-all duration-200
      "
    >
      {name}
    </Link>
  );
}
