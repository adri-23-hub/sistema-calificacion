import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageFile, IMAGE_TARGET_BYTES } from "./image-compress";

afterEach(() => vi.unstubAllGlobals());

function mockCanvas(size: (width: number) => number) {
  const bitmap = { width: 4000, height: 3000, close: vi.fn() };
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }),
    toDataURL: () => "data:image/webp;base64,",
    toBlob(callback: BlobCallback, mime: string) {
      callback(new Blob([new Uint8Array(size(this.width))], { type: mime }));
    },
  };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  vi.stubGlobal("document", { createElement: () => canvas });
  return { canvas, bitmap };
}

describe("compresión de fotografías", () => {
  it("reduce también las dimensiones cuando bajar calidad no alcanza 200 KB", async () => {
    const { canvas, bitmap } = mockCanvas((width) => width >= 1000 ? 250 * 1024 : 190 * 1024);
    const result = await compressImageFile(new File(["foto"], "foto.jpg", { type: "image/jpeg" }));
    expect(canvas.width).toBeLessThan(1200);
    expect(canvas.width / canvas.height).toBeCloseTo(4 / 3, 1);
    expect(result.compressedSize).toBeLessThanOrEqual(IMAGE_TARGET_BYTES);
    expect(result.mime).toBe("image/webp");
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("informa si no puede alcanzar el límite en vez de devolver una foto demasiado grande", async () => {
    mockCanvas(() => IMAGE_TARGET_BYTES + 1);
    await expect(compressImageFile(new File(["foto"], "foto.jpg", { type: "image/jpeg" }))).rejects.toThrow("200 KB");
  });

  it("rechaza formatos ajenos a JPG, PNG y WebP", async () => {
    await expect(compressImageFile(new File(["svg"], "foto.svg", { type: "image/svg+xml" }))).rejects.toThrow();
  });
});
