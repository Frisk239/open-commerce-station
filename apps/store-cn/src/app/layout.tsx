import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Outfit({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "我的店",
  description: "Merchant-owned China Station",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
