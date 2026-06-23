import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "日誌・タスク管理",
  description: "会話ログとタスクをまとめて管理",
  manifest: "/manifest.json",
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#FAFAF9]">
        <main className="mx-auto max-w-2xl pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
