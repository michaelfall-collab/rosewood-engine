import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rosewood CRM Engine",
  description: "Enterprise CRM Infrastructure Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-zinc-50/50 text-zinc-900 antialiased">
      <body className={`${inter.className} h-full flex flex-col`}>
        {/* Top Header Navigation Panel */}
        <header className="border-b border-zinc-200 bg-white px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-1 bg-indigo-600 rounded-full" />
            <span className="font-sans font-bold tracking-tight text-zinc-900 text-base">
              Rosewood <span className="text-zinc-400 font-light font-mono text-sm ml-1">// Engine</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200 font-mono">
              v1.0.0-stable
            </span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar - Clean & Modern */}
          <nav className="w-64 border-r border-zinc-200 bg-white p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono">Management</div>
                <div className="space-y-1">
                  <Link href="/" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all duration-200 group">
                    <span className="text-zinc-400 group-hover:text-zinc-600 transition">🚀</span>
                    <span>Launchpad</span>
                  </Link>
                  <Link href="/core" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all duration-200 group">
                    <span className="text-zinc-400 group-hover:text-zinc-600 transition">🛡️</span>
                    <span>Core Standards</span>
                  </Link>
                  <Link href="/studio" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all duration-200 group">
                    <span className="text-zinc-400 group-hover:text-zinc-600 transition">🎨</span>
                    <span>Feature Studio</span>
                  </Link>
                  <Link href="/vault" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all duration-200 group">
                    <span className="text-zinc-400 group-hover:text-zinc-600 transition">📁</span>
                    <span>The Vault</span>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Environment Footer Badge */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-medium text-zinc-400 uppercase font-mono tracking-wider">Target Status</div>
              <div className="text-xs text-amber-600 font-semibold mt-1 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                <span>Awaiting Authentication</span>
              </div>
            </div>
          </nav>

          {/* Main Space Viewport View */}
          <main className="flex-1 overflow-y-auto bg-zinc-50/50 p-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}