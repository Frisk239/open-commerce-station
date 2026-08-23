import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, isAbsolute, resolve, sep } from "node:path";
import type { StationFlavor } from "@ocs/core";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageKind = "logo" | "favicon" | "police-badge";

export interface ImageUpload {
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface StoredImage {
  readonly url: string;
  readonly contentType: "image/jpeg" | "image/png" | "image/webp";
  readonly bytes: Uint8Array;
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

function detectImage(bytes: Uint8Array): Pick<StoredImage, "contentType"> & { extension: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", extension: ".png" };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: ".jpg" };
  }

  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: ".webp" };
  }

  return null;
}

function assertSafeMediaUrl(url: string): { flavor: StationFlavor; filename: string } {
  const match = /^\/media\/(cn|global)\/([a-z-]+-[0-9a-f-]+\.(?:png|jpg|webp))$/.exec(url);

  if (!match?.[1] || !match[2]) {
    throw new MediaValidationError("Invalid media URL.");
  }

  return { flavor: match[1] as StationFlavor, filename: match[2] };
}

export class DiskImageStore {
  readonly #root: string;

  constructor(root: string) {
    this.#root = resolve(root);
  }

  async save(flavor: StationFlavor, kind: ImageKind, upload: ImageUpload): Promise<string> {
    if (upload.size <= 0 || upload.size > MAX_IMAGE_BYTES) {
      throw new MediaValidationError("Image must be between 1 byte and 5 MB.");
    }

    const bytes = new Uint8Array(await upload.arrayBuffer());
    const image = detectImage(bytes);

    if (!image) {
      throw new MediaValidationError("Only genuine JPG, PNG, and WebP images are accepted.");
    }

    const directory = resolve(this.#root, flavor);
    const filename = `${kind}-${randomUUID()}${image.extension}`;
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, filename), bytes, { flag: "wx" });

    return `/media/${flavor}/${filename}`;
  }

  async read(url: string): Promise<StoredImage> {
    const { flavor, filename } = assertSafeMediaUrl(url);
    const path = resolve(this.#root, flavor, filename);
    const expectedPrefix = `${resolve(this.#root, flavor)}${sep}`;

    if (!path.startsWith(expectedPrefix)) {
      throw new MediaValidationError("Media path escaped the upload directory.");
    }

    const bytes = new Uint8Array(await readFile(path));
    const image = detectImage(bytes);

    if (!image || extname(filename) !== image.extension) {
      throw new MediaValidationError("Stored media is not a supported image.");
    }

    return { url, contentType: image.contentType, bytes };
  }

  async remove(url: string | undefined): Promise<void> {
    if (!url) return;

    const { flavor, filename } = assertSafeMediaUrl(url);
    await rm(resolve(this.#root, flavor, filename), { force: true });
  }
}

let configuredStore: DiskImageStore | undefined;

export function getImageStore(): DiskImageStore {
  if (!configuredStore) {
    const uploadDirectory = process.env.UPLOAD_DIR;

    if (!uploadDirectory) {
      throw new Error("UPLOAD_DIR is required to read or write Merchant images.");
    }

    if (!isAbsolute(uploadDirectory)) {
      throw new Error("UPLOAD_DIR must be an absolute path so every process reads the same Merchant images.");
    }

    configuredStore = new DiskImageStore(uploadDirectory);
  }

  return configuredStore;
}
