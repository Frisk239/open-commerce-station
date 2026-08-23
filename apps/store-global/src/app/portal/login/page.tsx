import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/portal/settings");
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f0e8] px-5 py-12 text-stone-950">
      <section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-7 shadow-[0_24px_80px_rgba(28,25,23,0.10)] md:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Global Station</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.04em]">Enter the Merchant Portal</h1>
        <p className="mt-3 leading-7 text-stone-600">Use the one owner email and password provisioned with this deployment.</p>
        {error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">The email or password is incorrect.</p> : null}
        <form action={login} className="mt-8 space-y-5">
          <input type="hidden" name="redirectTo" value="/portal/settings" />
          <label className="block text-sm font-semibold">
            Owner email
            <input name="email" type="email" required autoComplete="username" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <button type="submit" className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">Sign in</button>
        </form>
        <Link href="/" className="mt-7 inline-block text-sm text-stone-500 underline decoration-stone-300 underline-offset-4">Back to Storefront</Link>
      </section>
    </main>
  );
}
