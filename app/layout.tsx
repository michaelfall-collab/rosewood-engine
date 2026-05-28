// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rosewood Engine — Pipedrive Image Manager",
  description: "High-velocity CRM template configuration utility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 antialiased">
      <head>
        {/* Load Tabler Icons used in the Proof of Concept layout */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body className="h-full font-sans overflow-x-hidden selection:bg-emerald-500/10 selection:text-emerald-500">
        <main className="min-h-screen w-full flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
