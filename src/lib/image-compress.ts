/**
 * Compresión de imágenes en el navegador (sin dependencias).
 * Redimensiona y re-encodea a JPEG/WebP hasta alcanzar un tamaño objetivo,
 * pensado para fotos oficiales de danzas, candidatas y logos.
 *
 * Uso exclusivo en el cliente ("use client" en el componente llamador).
 */

export const IMAGE_MAX_EDGE = 1200; // px, lado más largo
export const IMAGE_TARGET_BYTES = 200 * 1024; // 200 KB objetivo
export const IMAGE_MIN_QUALITY = 0.5;
export const IMAGE_START_QUALITY = 0.85;

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface CompressResult {
  blob: Blob;
  mime: string;
  originalSize: number;
  compressedSize: number;
}

function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  // Fallback para navegadores sin createImageBitmap
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen (¿formato no soportado?)."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mime, quality);
  });
}

/**
 * Comprime un archivo de imagen:
 *  - escala al máximo de IMAGE_MAX_EDGE px en el lado largo,
 *  - encodea a image/webp (si el navegador lo soporta) o image/jpeg,
 *  - baja la calidad progresivamente hasta ≤ IMAGE_TARGET_BYTES.
 */
export async function compressImageFile(file: File): Promise<CompressResult> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new Error("El archivo no es una imagen válida.");
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    throw new Error(
      "No se pudo procesar la imagen. Si es HEIC del iPhone, actívala como JPG antes de subirla."
    );
  }

  const srcWidth = "width" in bitmap ? bitmap.width : 0;
  const srcHeight = "height" in bitmap ? bitmap.height : 0;
  if (!srcWidth || !srcHeight) {
    throw new Error("La imagen está vacía o dañada.");
  }

  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no es compatible con el procesado de imágenes.");

  // Fondo blanco (fase de pasaporte): evita transparencias que pesan más al comprimir a JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetWidth, targetHeight);

  // Detección de soporte WebP (encodeo)
  const webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const mime = webpSupported ? "image/webp" : "image/jpeg";

  let quality = IMAGE_START_QUALITY;
  let blob = await canvasToBlob(canvas, mime, quality);
  while (blob && blob.size > IMAGE_TARGET_BYTES && quality > IMAGE_MIN_QUALITY) {
    quality = Math.max(IMAGE_MIN_QUALITY, quality - 0.08);
    const next = await canvasToBlob(canvas, mime, quality);
    if (!next) break;
    blob = next;
  }

  if (!blob) throw new Error("No se pudo comprimir la imagen.");

  // Algunas fotos con mucho detalle siguen siendo pesadas a calidad mínima.
  while (blob.size > IMAGE_TARGET_BYTES && Math.max(canvas.width, canvas.height) > 128) {
    canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
    canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const smaller = await canvasToBlob(canvas, mime, IMAGE_MIN_QUALITY);
    if (!smaller) break;
    blob = smaller;
  }
  if ("close" in bitmap) bitmap.close();
  if (blob.size > IMAGE_TARGET_BYTES) {
    throw new Error("No se pudo reducir la imagen a 200 KB. Elige otra fotografía.");
  }

  return {
    blob,
    mime: blob.type || mime,
    originalSize: file.size,
    compressedSize: blob.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
