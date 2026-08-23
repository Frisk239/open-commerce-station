"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** 看货不用登录；结账要账号。注册也在这里，一套表单。 */
export default function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ flavor: string }>;
  searchParams: SearchParams;
}) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const sp = use(searchParams);
  const nextRaw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = nextRaw || `/${f}/account`;

  const t = useT(f);
  const login = useShop((s) => s.loginShopper);
  const register = useShop((s) => s.registerShopper);
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailTrim = email.trim();
    if (!emailTrim || !password) return;
    const ok =
      mode === "signin"
        ? login(f, emailTrim, password)
        : register(f, emailTrim, password, name.trim() || emailTrim.split("@")[0]);
    if (ok) {
      router.push(next);
    } else {
      setError(mode === "signin" ? t("login.wrong") : t("login.taken"));
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {mode === "signin" ? t("login.signInTitle") : t("login.signUpTitle")}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">{t("login.note")}</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "signup" ? (
          <Field label={t("login.name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
        ) : null}
        <Field label={t("login.email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label={t("login.password")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full">
          {mode === "signin" ? t("login.signIn") : t("login.signUp")}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
        }}
        className="mt-4 text-sm text-pine-700 underline-offset-4 hover:underline"
      >
        {mode === "signin" ? t("login.toSignUp") : t("login.toSignIn")}
      </button>

      <div className="mt-10 rounded-xl border border-line bg-mist/60 p-4 text-sm">
        <p className="font-medium text-ink">{t("login.demo")}</p>
        <ul className="mt-2 space-y-1 text-ink-soft">
          <li>
            {t("login.demoShopper")}：jane@demo.shop / demo
          </li>
          <li>
            {t("login.demoOwner")}: owner@demo.shop / demo
          </li>
        </ul>
      </div>
    </div>
  );
}
