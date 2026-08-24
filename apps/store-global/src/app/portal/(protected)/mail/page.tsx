import { listPortalNoticeMails, readMailConfig } from "@ocs/data";
import { MailManager } from "@ocs/portal/mail";
import { flushNoticeMails } from "../../../../notice-mail";
import { retryMail, saveMailSettings } from "./actions";

export default async function MailPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ saved?: string; error?: string; retried?: string }>;
}) {
  const query = await searchParams;
  // Visiting the back office flushes pending letters; the outbox keeps failures visible and retryable.
  await flushNoticeMails("global");
  const [config, outbox] = await Promise.all([readMailConfig("global"), listPortalNoticeMails("global")]);
  return <MailManager flavor="global" config={config} outbox={outbox} saved={query.saved === "1"} error={query.error} retried={query.retried === "1"} saveAction={saveMailSettings} retryAction={retryMail} />;
}
