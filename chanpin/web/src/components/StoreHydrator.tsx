"use client";

import { useEffect } from "react";
import { useShop } from "@/mock/store";

/** 挂载后从 sessionStorage 恢复内存店数据；SSR 首帧仍是种子数据，不会水合错位 */
export function StoreHydrator() {
  useEffect(() => {
    void useShop.persist.rehydrate();
  }, []);
  return null;
}
