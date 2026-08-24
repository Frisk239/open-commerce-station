import { listPaymentMethods } from "@ocs/data";
import { paymentProviderReady } from "../../../../payment-provider";
import { updateAlipay } from "./actions";

export default async function PaymentsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [methods, params] = await Promise.all([listPaymentMethods("cn"), searchParams]);
  const alipay = methods.find((method) => method.provider === "alipay");
  const ready = paymentProviderReady();
  return <section><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Payment Methods</p><h1 className="mt-3 text-4xl font-bold">支付配置</h1><p className="mt-3 max-w-2xl text-stone-600">密钥只从服务端环境变量读取，不会保存到数据库或发送给浏览器。启用前会检查支付宝应用配置是否完整。</p>{params.saved === "1" ? <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">支付配置已保存。</p> : null}{params.error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">支付宝服务端配置不完整，暂时不能启用。</p> : null}<div className="mt-8 grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-stone-200 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">支付宝</h2><p className="mt-2 text-sm text-stone-600">电脑网站支付与手机网站支付，支付结果以验签通知或主动查询为准。</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${alipay?.enabled && ready ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-600"}`}>{alipay?.enabled && ready ? "已启用" : "未启用"}</span></div><p className="mt-5 text-xs text-stone-500">服务端配置：{ready ? "完整" : "缺少 ALIPAY_* 或 PUBLIC_BASE_URL"}</p><form action={updateAlipay} className="mt-5"><input type="hidden" name="enabled" value={alipay?.enabled ? "0" : "1"} /><button disabled={!ready && !alipay?.enabled} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{alipay?.enabled ? "停用支付宝" : "启用支付宝"}</button></form></article><article className="rounded-3xl border border-stone-200 bg-stone-100 p-6 text-stone-500"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-stone-700">微信支付</h2><p className="mt-2 text-sm">能力槽位已保留，但本版本不能启用，也不会显示在消费者 Checkout。</p></div><span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold">稍后开放</span></div><button disabled className="mt-10 rounded-full border border-stone-300 px-5 py-3 text-sm font-bold opacity-50">不可启用</button></article></div></section>;
}
