import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QReady",
  description: "Hardware-free pager for queues – scan, wait, get buzzed.",
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
};

const raw = process.env.MAINTENANCE_MODE?.toLowerCase?.() ?? "";
const isMaintenanceMode =
  raw === "true" || raw === "1" || raw === "yes" || raw === "on";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isMaintenanceMode ? (
          <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
            <h1 className="text-2xl font-semibold">Temporarily unavailable</h1>
            <p className="mt-2 text-zinc-400">
              QReady is currently offline for maintenance. Please try again later.
            </p>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
