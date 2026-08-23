import type { ReactNode } from "react";
import { notFound } from "next/navigation";

export default async function FlavorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ flavor: string }>;
}) {
  const { flavor } = await params;
  if (flavor !== "cn" && flavor !== "global") notFound();
  return <>{children}</>;
}
