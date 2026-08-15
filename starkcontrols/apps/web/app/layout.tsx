import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StarkControls",
  description:
    "Project controls for Starkvisionz Holdings — schedule, cost and change management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
