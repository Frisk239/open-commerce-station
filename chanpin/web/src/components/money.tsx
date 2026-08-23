"use client";

import { useMoney } from "@/lib/hooks";
import type { Flavor } from "@/lib/types";

/** 金额展示：店面按顾客货币换算，后台按记账货币 */
export function Money({
  flavor,
  minor,
  mode = "shop",
  className,
}: {
  flavor: Flavor;
  minor: number;
  mode?: "shop" | "portal";
  className?: string;
}) {
  const fmt = useMoney(flavor, mode);
  return <span className={className}>{fmt(minor)}</span>;
}
