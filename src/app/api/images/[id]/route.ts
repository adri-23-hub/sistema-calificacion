import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/images/[id] — público (las fotos no son datos sensibles).
 * Sirve los bytes con caché inmutable: un id apunta siempre a la misma imagen.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[a-z0-9]{1,64}$/i.test(id)) return new Response("Imagen no encontrada", { status: 404 });

  const image = await prisma.storedImage.findUnique({ where: { id } });
  if (!image) {
    return new Response("Imagen no encontrada", { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    status: 200,
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
