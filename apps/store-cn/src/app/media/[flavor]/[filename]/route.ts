import { getImageStore } from "@ocs/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ flavor: string; filename: string }> },
) {
  const { flavor, filename } = await params;
  if (flavor !== "cn") return new Response("Not found", { status: 404 });

  try {
    const image = await getImageStore().read(`/media/${flavor}/${filename}`);
    return new Response(Buffer.from(image.bytes), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": image.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
