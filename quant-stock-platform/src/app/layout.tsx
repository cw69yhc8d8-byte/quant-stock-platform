import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    {
      path: "./fonts/geist-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/geist-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    {
      path: "./fonts/geist-mono-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/geist-mono-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "量化炒股网页平台",
  description: "投资研究与交易复盘辅助系统原型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
