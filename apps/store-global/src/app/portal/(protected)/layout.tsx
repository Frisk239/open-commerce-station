import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "../../../auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");

  return (
    <div className="min-h-screen bg-[#f3f0e8] text-stone-950">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white/80 px-5 py-4 backdrop-blur md:px-10">
        <div className="flex items-center gap-6">
          <Link href="/portal/settings" className="font-[family-name:var(--font-display)] text-lg font-semibold">Merchant Portal</Link>
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-950">View Storefront</Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-stone-500 sm:inline">{session.user.email}</span>
          <form action={logout}><button type="submit" className="rounded-full border border-stone-300 px-4 py-2 font-semibold hover:border-stone-950">Sign out</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">{children}</main>
    </div>
  );
}
