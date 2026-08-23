import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DiskImageStore, MAX_IMAGE_BYTES, MediaValidationError } from "../src/index";

const directories: string[] = [];

async function temporaryStore(): Promise<DiskImageStore> {
  const directory = await mkdtemp(join(tmpdir(), "ocs-media-"));
  directories.push(directory);
  return new DiskImageStore(directory);
}

function upload(bytes: number[]) {
  const data = Uint8Array.from(bytes);
  return { size: data.byteLength, arrayBuffer: async () => data.buffer };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("DiskImageStore", () => {
  it("stores images under a flavor-scoped immutable URL and reads them back", async () => {
    const store = await temporaryStore();
    const url = await store.save("cn", "logo", upload([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    expect(url).toMatch(/^\/media\/cn\/logo-[0-9a-f-]+\.png$/);
    await expect(store.read(url)).resolves.toMatchObject({ contentType: "image/png", url });
  });

  it("rejects spoofed and oversized files before writing", async () => {
    const store = await temporaryStore();

    await expect(store.save("global", "logo", upload([1, 2, 3]))).rejects.toBeInstanceOf(MediaValidationError);
    await expect(store.save("global", "logo", {
      size: MAX_IMAGE_BYTES + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    })).rejects.toBeInstanceOf(MediaValidationError);
  });

  it("does not resolve traversal-shaped public URLs", async () => {
    const store = await temporaryStore();
    await expect(store.read("/media/cn/../secrets.png")).rejects.toBeInstanceOf(MediaValidationError);
  });
});
