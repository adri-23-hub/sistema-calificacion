import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 200 * 1024;

/**
 * POST /api/images (solo ADMIN)
 * Recibe FormData { file: Blob } (ya comprimido en el cliente)
 * y lo guarda en la tabla StoredImage. Devuelve { id, url }.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo 'file'" }, { status: 400 });
  }

  if (!ALLOWED_MIMES.has(file.type)) {
    return Response.json(
      { error: `Formato no permitido (${file.type}). Usa JPG, PNG o WebP.` },
      { status: 415 }
    );
  }

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "La imagen debe contener datos y pesar como máximo 200 KB ya comprimida." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const decoder = sharp(buffer, { limitInputPixels: 1200 * 1200, failOn: "warning" });
    const metadata = await decoder.metadata();
    const expectedFormat = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[file.type];
    if (metadata.format !== expectedFormat || !metadata.width || !metadata.height ||
        metadata.width > 1200 || metadata.height > 1200 || (metadata.pages ?? 1) > 1) {
      return Response.json({ error: "Imagen inválida: usa una fotografía estática de hasta 1200 px." }, { status: 415 });
    }
    // Decodificar todos los píxeles detecta archivos truncados o dañados.
    await decoder.raw().toBuffer();
  } catch {
    return Response.json({ error: "El archivo no contiene una imagen válida." }, { status: 415 });
  }

  try {
    const stored = await prisma.storedImage.create({
      data: {
        mime: file.type,
        data: buffer,
        size: buffer.byteLength,
      },
    });

    return Response.json({ id: stored.id, url: `/api/images/${stored.id}` });
  } catch (error) {
    console.error("Error guardando imagen:", error);
    return Response.json({ error: "No se pudo guardar la imagen." }, { status: 500 });
  }
}
