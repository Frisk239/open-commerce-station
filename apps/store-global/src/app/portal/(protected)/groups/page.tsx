import { listCatalogGroups } from "@ocs/data";
import { GroupManager } from "@ocs/portal/groups";
import { removeGroup, saveGroup } from "./actions";

export default async function GroupsPage({ searchParams }: { readonly searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [groups, params] = await Promise.all([listCatalogGroups("global"), searchParams]);
  const error = params.error === "invalid-fields" || params.error === "not-found" ? params.error : undefined;
  return <GroupManager flavor="global" groups={groups} saveAction={saveGroup} deleteAction={removeGroup} saved={params.saved === "1"} error={error} />;
}
