"use client";

import type { MailConfigView, NoticeMailView } from "@ocs/data";
import type { StationFlavor } from "@ocs/core";
import { useFormStatus } from "react-dom";

interface MailManagerProps {
  readonly flavor: StationFlavor;
  readonly config: MailConfigView | null;
  readonly outbox: readonly NoticeMailView[];
  readonly saved: boolean;
  readonly error?: string;
  readonly retried: boolean;
  readonly saveAction: (formData: FormData) => void | Promise<void>;
  readonly retryAction: (formData: FormData) => void | Promise<void>;
}

const kindCopy: Record<string, { zh: string; en: string }> = {
  paid: { zh: "支付成功", en: "Payment received" },
  shipped: { zh: "已发货", en: "Shipped" },
  "owner-new-order": { zh: "老板来单", en: "Owner new order" },
  "password-reset": { zh: "密码重置", en: "Password reset" },
};

const statusCopy: Record<string, { zh: string; en: string }> = {
  pending: { zh: "待发送", en: "Pending" },
  sent: { zh: "已发送", en: "Sent" },
  failed: { zh: "发送失败", en: "Failed" },
};

function SaveButton({ zh }: { readonly zh: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{pending ? (zh ? "保存中…" : "Saving…") : zh ? "保存邮件设置" : "Save mail settings"}</button>;
}

export function MailManager({ flavor, config, outbox, saved, error, retried, saveAction, retryAction }: MailManagerProps) {
  const zh = flavor === "cn";
  const copy = zh ? {
    eyebrow: "商家后台 · 邮件", title: "通知邮件", intro: "三封系统邮件：顾客支付成功、顾客已发货（带运单号）、店主来单。SMTP 信息只保存在服务端，密码不会回显到浏览器。",
    host: "SMTP 服务器", port: "端口", secure: "使用 SSL/TLS（465 端口）", username: "用户名（选填）", password: "密码（留空保持不变）", from: "发件邮箱", owner: "店主收件邮箱",
    save: "保存邮件设置", savedMsg: "邮件设置已保存。", errorMsg: "没有保存：请检查服务器、端口和邮箱格式。",
    outboxTitle: "发件箱", outboxIntro: "每一封通知邮件都在这里。发送失败的信可以重试；去重键保证同一事件永不重复入队。", empty: "还没有通知邮件。订单确认或发货后会出现在这里。",
    kind: "类型", to: "收件人", subject: "主题", status: "状态", attempts: "尝试", time: "时间", retry: "重试", preview: "正文预览",
  } : {
    eyebrow: "Merchant Portal · Mail", title: "Notice Mail", intro: "Three system letters: shopper paid, shopper shipped with tracking, owner new order. SMTP settings stay on the server; the password never echoes back to the browser.",
    host: "SMTP host", port: "Port", secure: "Use SSL/TLS (port 465)", username: "Username (optional)", password: "Password (blank keeps current)", from: "From mailbox", owner: "Owner mailbox",
    save: "Save mail settings", savedMsg: "Mail settings saved.", errorMsg: "Not saved: check the host, port, and mailbox formats.",
    outboxTitle: "Outbox", outboxIntro: "Every notice letter is listed here. Failed letters can be retried; the event key guarantees one event never queues twice.", empty: "No notice mail yet. Letters appear as orders are confirmed or shipped.",
    kind: "Kind", to: "To", subject: "Subject", status: "Status", attempts: "Attempts", time: "Time", retry: "Retry", preview: "Body preview",
  };

  return <section>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{copy.eyebrow}</p>
    <h1 className="mt-3 text-4xl font-bold">{copy.title}</h1>
    <p className="mt-3 max-w-2xl text-stone-600">{copy.intro}</p>
    {saved ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{copy.savedMsg}</p> : null}
    {error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{copy.errorMsg}</p> : null}

    <form action={saveAction} className="mt-8 grid gap-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-7">
      <label className="text-sm font-semibold text-stone-900">{copy.host}<input name="host" required maxLength={255} defaultValue={config?.host ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold text-stone-900">{copy.port}<input name="port" type="number" min={1} max={65535} required defaultValue={config?.port ?? 465} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold text-stone-900">{copy.from}<input name="fromEmail" type="email" required maxLength={320} defaultValue={config?.fromEmail ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold text-stone-900">{copy.owner}<input name="ownerToEmail" type="email" required maxLength={320} defaultValue={config?.ownerToEmail ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold text-stone-900">{copy.username}<input name="username" maxLength={255} defaultValue={config?.username ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold text-stone-900">{copy.password}<input name="password" type="password" maxLength={512} placeholder={config?.hasPassword ? (zh ? "已设置（留空保持不变）" : "Set (leave blank to keep)") : ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="flex items-center gap-3 text-sm font-semibold text-stone-900 md:col-span-2"><input type="checkbox" name="secure" value="1" defaultChecked={config?.secure ?? true} className="size-4 accent-emerald-700" />{copy.secure}</label>
      <div className="md:col-span-2"><SaveButton zh={zh} /></div>
    </form>

    <div className="mt-12">
      <h2 className="text-2xl font-bold">{copy.outboxTitle}</h2>
      <p className="mt-2 max-w-3xl text-sm text-stone-600">{copy.outboxIntro}</p>
      {retried ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{zh ? "已重置为待发送，稍后自动或访问本页时再次尝试。" : "Reset to pending; it will retry on the next drain."}</p> : null}
      {outbox.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">{copy.empty}</p> : (
        <div className="mt-6 space-y-4">
          {outbox.map((mail) => (
            <article key={mail.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${mail.status === "sent" ? "bg-emerald-100 text-emerald-900" : mail.status === "failed" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>{statusCopy[mail.status]?.[zh ? "zh" : "en"] ?? mail.status}</span>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">{kindCopy[mail.kind]?.[zh ? "zh" : "en"] ?? mail.kind}</span>
                <span className="font-semibold">{mail.subject}</span>
                <span className="text-stone-500">→ {mail.toEmail}</span>
                <span className="ml-auto text-xs text-stone-400">{zh ? `尝试 ${mail.attempts} 次` : `${mail.attempts} attempts`} · {new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(mail.sentAt ?? mail.createdAt)}</span>
                {mail.status === "failed" ? <form action={retryAction}><input type="hidden" name="id" value={mail.id} /><button className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-bold hover:bg-stone-50">{copy.retry}</button></form> : null}
              </div>
              {mail.lastError ? <p className="mt-2 text-xs text-red-700">{mail.lastError}</p> : null}
              <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-stone-500">{copy.preview}</summary><pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-700">{mail.bodyText}</pre></details>
            </article>
          ))}
        </div>
      )}
    </div>
  </section>;
}
