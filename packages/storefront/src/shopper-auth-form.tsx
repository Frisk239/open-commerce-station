import type { StationFlavor } from "@ocs/core";
import Link from "next/link";

interface ShopperAuthFormProps {
  readonly flavor: StationFlavor;
  readonly mode: "login" | "register";
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly returnTo: string;
  readonly error?: "credentials" | "duplicate" | "invalid";
}

const copy = {
  cn: { loginTitle: "登录 Shopper Account", registerTitle: "注册 Shopper Account", intro: "浏览无需登录；进入 Checkout 和查看订单需要这个独立账号。", email: "邮箱", password: "密码", passwordHint: "至少 12 个字符", login: "登录并继续", register: "注册并继续", toRegister: "还没有账号？注册", toLogin: "已有账号？登录", credentials: "邮箱或密码不正确。", duplicate: "这个邮箱已经注册，请直接登录。", invalid: "请填写有效邮箱和至少 12 个字符的密码。", back: "返回购物车" },
  global: { loginTitle: "Sign in to Shopper Account", registerTitle: "Create Shopper Account", intro: "Browsing stays public. Checkout and Order access use this separate Shopper identity.", email: "Email", password: "Password", passwordHint: "At least 12 characters", login: "Sign in and continue", register: "Register and continue", toRegister: "New here? Register", toLogin: "Already registered? Sign in", credentials: "Email or password is incorrect.", duplicate: "That email is already registered. Sign in instead.", invalid: "Use a valid email and a password of at least 12 characters.", back: "Back to cart" },
} as const;

export function ShopperAuthForm({ flavor, mode, action, returnTo, error }: ShopperAuthFormProps) {
  const labels = copy[flavor]; const login = mode === "login";
  const otherHref = `${login ? "/account/register" : "/account/login"}?returnTo=${encodeURIComponent(returnTo)}`;
  return <main className="grid min-h-screen place-items-center bg-[#f3f0e8] px-5 py-12 text-stone-950"><section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-7 shadow-[0_24px_80px_rgba(28,25,23,0.10)] md:p-9"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Shopper Account</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.04em]">{login ? labels.loginTitle : labels.registerTitle}</h1><p className="mt-3 leading-7 text-stone-600">{labels.intro}</p>{error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error === "duplicate" ? labels.duplicate : error === "invalid" ? labels.invalid : labels.credentials}</p> : null}<form action={action} className="mt-8 space-y-5"><input type="hidden" name="redirectTo" value={returnTo} /><label className="block text-sm font-semibold">{labels.email}<input name="email" type="email" required autoComplete="username" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label><label className="block text-sm font-semibold">{labels.password}<input name="password" type="password" required minLength={12} maxLength={128} autoComplete={login ? "current-password" : "new-password"} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-xs font-normal text-stone-500">{labels.passwordHint}</span></label><button className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">{login ? labels.login : labels.register}</button></form><div className="mt-7 flex items-center justify-between gap-4 text-sm"><Link href={otherHref} className="font-semibold underline underline-offset-4">{login ? labels.toRegister : labels.toLogin}</Link><Link href="/cart" className="text-stone-500 underline underline-offset-4">{labels.back}</Link></div></section></main>;
}
