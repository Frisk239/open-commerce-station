"use client";

import { use, useEffect, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { ChatWidget } from "@/components/storefront/ChatWidget";
import { useFlavorState } from "@/lib/hooks";
import type { Flavor } from "@/lib/types";

export default function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ flavor: string }>;
}) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const settings = useFlavorState(f).settings;

  // 店主设置的小图标（浏览器标签），没有则回退标志，再没有回退默认
  useEffect(() => {
    const href = settings.faviconUrl || settings.logoUrl;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (href) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = href;
    } else if (link) {
      link.href = "/favicon.ico";
    }
  }, [settings.faviconUrl, settings.logoUrl]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* React 19：<title> 会被提升到 head，店名即浏览器标签标题 */}
      <title>{settings.name}</title>
      <Header flavor={f} />
      <main>{children}</main>
      <Footer flavor={f} />
      <ChatWidget flavor={f} />
    </div>
  );
}
