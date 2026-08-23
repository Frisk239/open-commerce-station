import { listPolicies } from "@ocs/data";
import { PolicyManager } from "@ocs/portal/policies";
import { savePolicy } from "../commerce-actions";
export default async function PoliciesPage({ searchParams }: { readonly searchParams: Promise<{ saved?: string; error?: string }> }) { const [policies, params] = await Promise.all([listPolicies("cn"), searchParams]); return <PolicyManager flavor="cn" policies={policies} saveAction={savePolicy} saved={params.saved === "1"} error={params.error === "1"} />; }
