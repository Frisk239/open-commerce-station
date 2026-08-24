"use server";

import { retryNoticeMail, saveMailConfig, MailDataError, drainNoticeMails } from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeterministicMailTransport } from "@ocs/plugins";
import { mailTransportMode } from "../../../../notice-mail";
import { createNodemailerTransport } from "@ocs/plugins";
import { readMailTransportConfig } from "@ocs/data";
import { auth } from "../../../../auth";

function value(formData: FormData, name: string): string {
  const input = formData.get(name);
  return typeof input === "string" ? input.trim() : "";
}

export async function saveMailSettings(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  try {
    await saveMailConfig("cn", {
      host: value(formData, "host"),
      port: Number(value(formData, "port")),
      secure: formData.get("secure") === "1",
      username: value(formData, "username") || undefined,
      password: value(formData, "password") || undefined,
      fromEmail: value(formData, "fromEmail"),
      ownerToEmail: value(formData, "ownerToEmail"),
    });
  } catch (error) {
    if (error instanceof MailDataError) redirect("/portal/mail?error=invalid");
    throw error;
  }
  revalidatePath("/portal/mail");
  redirect("/portal/mail?saved=1");
}

export async function retryMail(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const id = formData.get("id");
  if (typeof id === "string") {
    await retryNoticeMail("cn", id).catch(() => undefined);
    if (mailTransportMode() === "deterministic") {
      await drainNoticeMails("cn", async (mail) => new DeterministicMailTransport().send(mail));
    } else {
      const config = await readMailTransportConfig("cn");
      if (config) await drainNoticeMails("cn", async (mail) => createNodemailerTransport(config).send(mail));
    }
  }
  revalidatePath("/portal/mail");
  redirect("/portal/mail?retried=1");
}
