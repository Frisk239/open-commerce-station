"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatCircleDots, X, PaperPlaneRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { useFlavorState, useSession, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { ChatMessage, Flavor } from "@/lib/types";

/** 结账页顶栏「客服」按钮通过这个自定义事件开窗，结账页不再挂浮球 */
export const OPEN_CHAT_EVENT = "shop:open-chat";

/**
 * 店面站内聊天窗：AI 先答（规则见 lib/chat-engine），退款必转人工。
 * 位置随页面让路：
 * - 商品详情 <md：钮和窗都抬到吸底购买条之上（bottom-24）
 * - 结账页：不渲染浮球，入口是顶栏文字「客服」（Header 里），付款区不被遮挡
 */
export function ChatWidget({ flavor }: { flavor: Flavor }) {
  const st = useFlavorState(flavor);
  const session = useSession(flavor);
  const t = useT(flavor);
  const send = useShop((s) => s.shopperSend);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 商品详情页（/cn|global/products/[slug]）手机端有吸底购买条；结账页入口收进顶栏
  const isProductPage = /\/products\/[^/]+$/.test(pathname);
  const isCheckout = /\/checkout$/.test(pathname);
  const raised = isProductPage;

  const threadId = session.shopperEmail ? `t-${session.shopperEmail}` : "visitor";
  const thread = st.threads.find((x) => x.id === threadId);
  const messages: ChatMessage[] = thread?.messages ?? [];

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, openChat);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openChat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  if (!st.settings.chatEnabled) return null;

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    send(flavor, v);
    setText("");
  };

  const roleTag = (role: ChatMessage["role"]) =>
    role === "shopper" ? t("chat.youTag") : role === "ai" ? t("chat.aiTag") : t("chat.staffTag");

  return (
    <>
      {open ? (
        <div
          className={`fixed inset-x-3 z-40 flex h-[min(72vh,540px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[368px] ${
            raised ? "bottom-24 sm:bottom-5" : "bottom-3 sm:bottom-5"
          }`}
        >
          {/* 白顶栏 + 一个小绿点，不要整条深绿 */}
          <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-pine-500" aria-hidden />
              {t("chat.title")}
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="close" className="rounded p-1 text-ink-soft hover:bg-mist hover:text-ink">
              <X size={16} weight="bold" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-mist/50 px-3.5 py-4">
            <Bubble role="ai" tag={t("chat.aiTag")} text={t("chat.greeting")} />
            {messages.map((m) => (
              <div key={m.id}>
                <Bubble role={m.role} tag={roleTag(m.role)} text={m.text} />
                {m.orderId ? (
                  <Link
                    href={`/${flavor}/account/orders/${m.orderId}`}
                    className="mt-1 inline-flex items-center gap-1 rounded-full border border-pine-300 bg-white px-2.5 py-1 text-xs font-medium text-pine-700 hover:bg-pine-50"
                  >
                    {t("chat.viewOrder")}
                    <ArrowRight size={12} />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          {messages.length <= 2 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line-soft px-3.5 py-2">
              {[t("chat.qShipping"), t("chat.qReturn"), t("chat.qOrder")].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => submit(q)}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft hover:border-pine-400 hover:text-pine-700"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-sm focus:border-pine-500 focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t("chat.send")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pine-700 text-white hover:bg-pine-800"
            >
              <PaperPlaneRight size={16} weight="bold" />
            </button>
          </form>
        </div>
      ) : (
        !isCheckout && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("chat.title")}
            className={`fixed right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-pine-700 text-white shadow-lg transition-colors hover:bg-pine-800 ${
              raised ? "bottom-24 md:bottom-5" : "bottom-5"
            }`}
          >
            <ChatCircleDots size={22} />
          </button>
        )
      )}
    </>
  );
}

function Bubble({ role, tag, text }: { role: ChatMessage["role"]; tag: string; text: string }) {
  const mine = role === "shopper";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          mine ? "bg-pine-700 text-white" : "border border-line bg-white text-ink"
        }`}
      >
        <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-white/70" : "text-ink-faint"}`}>{tag}</p>
        {text}
      </div>
    </div>
  );
}
