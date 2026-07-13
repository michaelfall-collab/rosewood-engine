import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rosewood CRM Build Studio",
  description: "Plan, price, and deploy Pipedrive CRM builds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
