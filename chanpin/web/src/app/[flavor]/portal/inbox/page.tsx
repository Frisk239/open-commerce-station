"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaperPlaneRight, ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import { Badge, Button, Card, EmptyBlock, Input } from "@/components/ui";
import { Money } from "@/components/money";
import { orderStatusText } from "@/lib/chat-engine";
import { useFlavorState, useLocale, useSession, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { ChatThread, Flavor } from "@/lib/types";

/** 后台收件箱：店面聊天线程在这里回。转人工的有标记。 */
export default function PortalInbox({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");
  const session = useSession(f);
  const staffReply = useShop((s) => s.staffReply);
  const markRead = useShop((s) => s.markThreadRead);
  const [selectedId, setSelectedId] = useState<string | null>(st.threads[0]?.id ?? null);
  const [reply, setReply] = useState("");

  const threads = st.threads;
  const thread: ChatThread | undefined = threads.find((x) => x.id === selectedId);

  useEffect(() => {
    if (thread?.unread) markRead(f, thread.id);
  }, [thread?.id, thread?.unread, markRead, f]);

  const shopperOrders = thread?.shopperEmail ? st.orders.filter((o) => o.shopperEmail === thread.shopperEmail) : [];
  const latestOrder = shopperOrders[0];

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navInbox")}</h1>

      {threads.length === 0 ? (
        <Card className="mt-6">
          <EmptyBlock icon={<ChatCircleDots size={36} />} title={t("p.inbox.empty")} />
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* 线程列表 */}
          <Card className="h-fit divide-y divide-line-soft overflow-hidden">
            {threads.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setSelectedId(x.id)}
                className={`block w-full px-4 py-3 text-left transition-colors ${
                  selectedId === x.id ? "bg-pine-50" : "hover:bg-mist/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink">{x.shopperEmail ?? t("p.inbox.visitor")}</p>
                  {x.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-pine-600" aria-label="unread" /> : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {x.messages[x.messages.length - 1]?.text ?? ""}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {x.escalated ? <Badge tone="amber">{t("p.inbox.escalatedTag")}</Badge> : null}
                  <span className="text-[11px] text-ink-faint">{x.updatedAt}</span>
                </div>
              </button>
            ))}
          </Card>

          {/* 对话 */}
          {thread ? (
            <div className="space-y-4">
              {/* 订单上下文 */}
              {latestOrder ? (
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs text-ink-faint">{t("p.inbox.orderCtx")}</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-ink">
                      {latestOrder.number} · <Money flavor={f} minor={latestOrder.total} mode="portal" />
                    </p>
                    <p className="text-xs text-ink-soft">{orderStatusText(latestOrder, locale)}</p>
                  </div>
                  <Link href={`/${f}/portal/orders/${latestOrder.id}`}>
                    <Button size="sm" variant="secondary">
                      {t("p.inbox.goOrder")}
                    </Button>
                  </Link>
                </Card>
              ) : null}

              <Card className="flex max-h-[52vh] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.messages.map((m) => {
                    const mine = m.role === "staff";
                    const tag = m.role === "shopper" ? t("p.inbox.shopperTag") : m.role === "ai" ? t("p.inbox.aiTag") : t("chat.staffTag");
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                            mine ? "bg-pine-700 text-white" : "border border-line bg-white text-ink"
                          }`}
                        >
                          <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-white/70" : "text-ink-faint"}`}>
                            {tag}
                          </p>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!reply.trim()) return;
                    staffReply(f, thread.id, reply.trim());
                    setReply("");
                  }}
                  className="flex items-center gap-2 border-t border-line-soft p-3"
                >
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("p.inbox.replyPh")}
                    aria-label={t("p.inbox.replyPh")}
                  />
                  <Button type="submit" aria-label={t("p.inbox.send")}>
                    <PaperPlaneRight size={15} weight="bold" />
                  </Button>
                </form>
              </Card>
              <p className="text-xs text-ink-faint">
                {session.owner ? t("p.chat.hint") : ""}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
