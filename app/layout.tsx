import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rosewood CRM Engine",
  description: "Enterprise CRM Infrastructure Management Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 antialiased transition-colors duration-200">
      <body className={`${inter.className} h-full flex flex-col`}>
        
        {/* Modern Header Panel - Light & Dark Adaptive */}
        <header className="border-b border-slate-200 bg-white px-8 py-4 flex justify-between items-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="h-5 w-1.5 bg-slate-700 dark:bg-slate-400 rounded-full" />
            <span className="font-sans font-bold tracking-tight text-slate-900 dark:text-zinc-100 text-base">
              Rosewood <span className="text-slate-400 dark:text-zinc-500 font-light font-mono text-sm ml-1">// Engine</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-mono">
              v1.0.0-stable
            </span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Steel & Charcoal Left Navigation Sidebar */}
          <nav className="w-64 border-r border-slate-200 bg-white p-6 flex flex-col justify-between dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-3 text-[10px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase font-mono">Control Desk</div>
                <div className="space-y-1">
                  <Link href="/" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all duration-150 group">
                    <span className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition">🚀</span>
                    <span>Launchpad</span>
                  </Link>
                  <Link href="/core" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all duration-150 group">
                    <span className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition">🛡️</span>
                    <span>Core Standards</span>
                  </Link>
                  <Link href="/studio" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all duration-150 group">
                    <span className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition">🎨</span>
                    <span>Feature Studio</span>
                  </Link>
                  <Link href="/vault" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all duration-150 group">
                    <span className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition">📁</span>
                    <span>The Vault</span>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Status Panel Environment Module */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-zinc-800/40 dark:border-zinc-800">
              <div className="text-[10px] font-bold font-mono tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Target Status</div>
              <div className="text-xs text-amber-600 dark:text-amber-500 font-semibold mt-1.5 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                <span>Awaiting Token Lock</span>
              </div>
            </div>
          </nav>

          {/* Core Content Viewport Workspace */}
          <main className="flex-1 overflow-y-auto bg-slate-50/50 p-10 dark:bg-zinc-950/40 transition-colors">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}