import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Geist_Mono, Syne, Noto_Sans_SC } from "next/font/google";
import { Toaster } from "@/components/ui";
import { StoreHydrator } from "@/components/StoreHydrator";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// 显示用无衬线：拉丁走 Syne，中文落到 Noto Sans SC 黑体（按 unicode-range 切片自托管），
// 让中英标题同一套「显示脸」；正文、表单、后台仍是 Manrope
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sc",
  display: "swap",
  weight: ["500", "700", "900"],
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-num",
  display: "swap",
});

export const metadata: Metadata = {
  // 标题不放根布局：店名由各店面/后台布局渲染 <title>，避免被根标题覆盖
  description: "开源独立站地基的可交互原型：国内站与出海站。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" className={`${manrope.variable} ${mono.variable} ${syne.variable} ${notoSC.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <StoreHydrator />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
