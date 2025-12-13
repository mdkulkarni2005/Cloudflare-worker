import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white shadow-xl p-6 flex flex-col">
          <h1 className="text-xl font-bold mb-6">Mini Edge Dashboard</h1>
          
          <nav className="flex flex-col gap-4">
            <Link href="/" className="text-gray-700 hover:text-black">Dashboard</Link>
            <Link href="/workers" className="text-gray-700 hover:text-black">Workers</Link>
            <Link href="/routes" className="text-gray-700 hover:text-black">Routes</Link>
            <Link href="/kv" className="text-gray-700 hover:text-black">KV Storage</Link>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-10 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
