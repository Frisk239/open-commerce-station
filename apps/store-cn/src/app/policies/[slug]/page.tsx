import type { PolicySlug } from "@ocs/core";
import { readPolicy } from "@ocs/data";
import { PolicyPage } from "@ocs/storefront/policy-page";
import { notFound } from "next/navigation";
const slugs: readonly string[] = ["privacy", "terms", "returns", "shipping"];
export const dynamic = "force-dynamic";
export default async function CurrentPolicyPage({ params }: { readonly params: Promise<{ slug: string }> }) { const { slug } = await params; if (!slugs.includes(slug)) notFound(); return <PolicyPage flavor="cn" policy={await readPolicy("cn", slug as PolicySlug)} />; }
