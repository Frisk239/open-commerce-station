import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { getStoreIdentity } from "../store";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Outfit({ subsets: ["latin"], variable: "--font-display" });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getStoreIdentity();
  return {
    title: identity.name,
    description: `Merchant-owned China Station · ${identity.name}`,
    icons: identity.faviconUrl ? { icon: identity.faviconUrl } : undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
