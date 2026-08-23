import type { StationFlavor, StoreIdentity } from "@ocs/core";
import { readStoreIdentity, writeStoreIdentity } from "@ocs/data";
import { getImageStore, MediaValidationError } from "@ocs/media";
import type { ImageKind } from "@ocs/media";
import { z } from "zod";

const identityFields = z.object({
  name: z.string().trim().min(1).max(120),
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(320)]),
  footerLine: z.string().trim().max(240),
  icp: z.string().trim().max(120),
  policeRecord: z.string().trim().max(120),
});

export type StoreIdentityFormErrorCode = "invalid-fields" | "invalid-image";

export class StoreIdentityFormError extends Error {
  constructor(readonly code: StoreIdentityFormErrorCode, message: string) {
    super(message);
    this.name = "StoreIdentityFormError";
  }
}

function optional(value: string): string | undefined {
  return value || undefined;
}

export function parseStoreIdentityFields(formData: FormData) {
  const result = identityFields.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") ?? "",
    footerLine: formData.get("footerLine") ?? "",
    icp: formData.get("icp") ?? "",
    policeRecord: formData.get("policeRecord") ?? "",
  });

  if (!result.success) {
    throw new StoreIdentityFormError("invalid-fields", "Check the required store name and field lengths.");
  }

  return result.data;
}

function uploadFrom(formData: FormData, name: string): File | undefined {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : undefined;
}

export async function updateIdentityFromForm(flavor: StationFlavor, formData: FormData): Promise<void> {
  const fields = parseStoreIdentityFields(formData);
  const current = await readStoreIdentity(flavor);
  const imageStore = getImageStore();
  const staged: string[] = [];

  async function nextImage(field: string, removeField: string, kind: ImageKind, existing: string | undefined) {
    const upload = uploadFrom(formData, field);

    if (upload) {
      const url = await imageStore.save(flavor, kind, upload);
      staged.push(url);
      return url;
    }

    return formData.get(removeField) === "on" ? undefined : existing;
  }

  try {
    const [logoUrl, faviconUrl, policeBadgeUrl] = await Promise.all([
      nextImage("logo", "removeLogo", "logo", current.logoUrl),
      nextImage("favicon", "removeFavicon", "favicon", current.faviconUrl),
      flavor === "cn"
        ? nextImage("policeBadge", "removePoliceBadge", "police-badge", current.policeBadgeUrl)
        : Promise.resolve(undefined),
    ]);
    const nextIdentity: StoreIdentity = {
      name: fields.name,
      logoUrl,
      faviconUrl,
      contactEmail: optional(fields.contactEmail),
      footerLine: optional(fields.footerLine),
      icp: flavor === "cn" ? optional(fields.icp) : undefined,
      policeRecord: flavor === "cn" ? optional(fields.policeRecord) : undefined,
      policeBadgeUrl,
    };

    await writeStoreIdentity(flavor, nextIdentity);

    const replaced = [current.logoUrl, current.faviconUrl, current.policeBadgeUrl]
      .filter((url): url is string => Boolean(url))
      .filter((url) => ![logoUrl, faviconUrl, policeBadgeUrl].includes(url));
    await Promise.allSettled(replaced.map((url) => imageStore.remove(url)));
  } catch (error) {
    await Promise.allSettled(staged.map((url) => imageStore.remove(url)));

    if (error instanceof MediaValidationError) {
      throw new StoreIdentityFormError("invalid-image", error.message);
    }

    throw error;
  }
}
