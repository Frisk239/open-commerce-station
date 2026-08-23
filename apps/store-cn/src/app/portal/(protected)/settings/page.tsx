import { StoreIdentityForm } from "@ocs/portal/form";
import { getStoreIdentity } from "../../../../store";
import { saveStoreIdentity } from "./actions";

export default async function StoreIdentitySettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const identity = await getStoreIdentity();
  const params = await searchParams;
  const error = params.error === "invalid-image" || params.error === "invalid-fields" ? params.error : undefined;

  return <StoreIdentityForm flavor="cn" identity={identity} action={saveStoreIdentity} saved={params.saved === "1"} error={error} />;
}
