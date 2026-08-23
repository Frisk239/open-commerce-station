"use client";

import { use, useState, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Storefront } from "@phosphor-icons/react/dist/ssr";
import { Button, Field, Input } from "@/components/ui";
import { useFlavorState, useSession, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import { Sidebar } from "@/components/portal/Sidebar";
import type { Flavor } from "@/lib/types";

export default function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ flavor: string }>;
}) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const session = useSession(f);
  const settings = useFlavorState(f).settings;

  if (!session.owner) return <PortalLogin flavor={f} />;

  return (
    <div className="min-h-dvh bg-mist/40">
      <title>{`${settings.name} · Merchant Portal`}</title>
      <div className="flex">
        <Sidebar flavor={f} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

function PortalLogin({ flavor }: { flavor: Flavor }) {
  const st = useFlavorState(flavor);
  const t = useT(flavor, "portal");
  const loginOwner = useShop((s) => s.loginOwner);
  const [email, setEmail] = useState("owner@demo.shop");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist/40 px-4">
      <title>{`${st.settings.name} · Merchant Portal`}</title>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-700 text-white">
            <Storefront size={18} />
          </span>
          <div>
            <p className="text-[15px] font-bold leading-tight text-ink">{st.settings.name}</p>
            <p className="text-xs text-ink-soft">{flavor === "cn" ? "国内站" : "出海站"} · {t("p.loginTitle")}</p>
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = loginOwner(flavor, email, password);
            if (!ok) setError(true);
          }}
        >
          <Field label={t("login.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label={t("login.password")} error={error ? t("login.wrong") : undefined}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            {t("p.loginEnter")}
          </Button>
        </form>

        <p className="mt-5 rounded-lg bg-mist px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">{t("p.loginHint")}</p>
        <Link href={`/${flavor}`} className="mt-4 inline-block text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          ← {t("p.viewStore")}
        </Link>
      </div>
    </div>
  );
}
