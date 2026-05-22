import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rosewood CRM IaC Engine",
  description: "Immutable CRM Infrastructure Architecture",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-900 text-slate-100">
      <body className={`${inter.className} h-full flex flex-col`}>
        {/* Top Header Panel */}
        <header className="border-b border-slate-800 bg-slate-950/50 px-6 py-4 flex justify-between items-center backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold tracking-wider text-slate-200">ROSEWOOD // CRM_IaC</span>
          </div>
          <div className="text-xs font-mono text-slate-400">v1.0.0-alpha</div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <nav className="w-64 border-r border-slate-800 bg-slate-950/20 p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="px-3 mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono">Operations Panel</div>
              <Link href="/" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                <span>🚀</span> <span className="font-mono">01_Launchpad</span>
              </Link>
              <Link href="/core" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                <span>🛡️</span> <span className="font-mono">02_Core_Images</span>
              </Link>
              <Link href="/studio" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                <span>🎨</span> <span className="font-mono">03_Feature_Studio</span>
              </Link>
              <Link href="/vault" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                <span>📁</span> <span className="font-mono">04_The_Vault</span>
              </Link>
            </div>
            
            <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-center">
              <div className="text-xs text-slate-400 font-mono">Target Environment</div>
              <div className="text-xs text-amber-500 font-mono font-bold mt-1">Awaiting_Handshake...</div>
            </div>
          </nav>

          {/* Main Workspace Viewport */}
          <main className="flex-1 overflow-y-auto bg-slate-900/40 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}