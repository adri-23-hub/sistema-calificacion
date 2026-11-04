import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { POST } from "./route";
import { GET } from "./[id]/route";
import { proxy } from "@/proxy";

const mocks = vi.hoisted(() => ({ session: vi.fn(), create: vi.fn(), find: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: mocks.session }));
vi.mock("@/lib/db", () => ({ prisma: { storedImage: { create: mocks.create, findUnique: mocks.find } } }));

function upload(data: Uint8Array, type = "image/jpeg") {
  const body = new FormData();
  body.set("file", new File([new Uint8Array(data)], "foto", { type }));
  return POST(new NextRequest("http://localhost/api/images", { method: "POST", body }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ role: "ADMIN" });
  mocks.create.mockResolvedValue({ id: "cimage123" });
});

describe("almacén de fotografías", () => {
  it("permite leer fotografías sin sesión y mantiene protegidas las subidas", async () => {
    const read = await proxy(new NextRequest("http://localhost/api/images/cimage123"));
    expect(read.headers.get("location")).toBeNull();
    const write = await proxy(new NextRequest("http://localhost/api/images", { method: "POST" }));
    expect(write.headers.get("location")).toBe("http://localhost/login");
  });
  it.each([null, { role: "JURADO" }, { role: "CONTROL" }, { role: "NOTARIO" }])("impide subir sin ADMIN: %j", async (session) => {
    mocks.session.mockResolvedValue(session);
    expect((await upload(new Uint8Array([1]))).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rechaza texto disfrazado de fotografía", async () => {
    expect((await upload(new TextEncoder().encode("<script>alert(1)</script>"))).status).toBe(415);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rechaza SVG, archivos vacíos y fotos mayores a 200 KB", async () => {
    expect((await upload(new Uint8Array([1]), "image/svg+xml")).status).toBe(415);
    expect((await upload(new Uint8Array())).status).toBe(413);
    expect((await upload(new Uint8Array(200 * 1024 + 1))).status).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("comprueba formato, dimensiones y decodificación antes de guardar", async () => {
    const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: "red" } }).png().toBuffer();
    expect((await upload(image, "image/jpeg")).status).toBe(415);
    expect((await upload(image.subarray(0, 45), "image/png")).status).toBe(415);
    const oversized = await sharp({ create: { width: 1201, height: 1, channels: 3, background: "red" } }).png().toBuffer();
    expect((await upload(oversized, "image/png")).status).toBe(415);
    expect(mocks.create).not.toHaveBeenCalled();
    const response = await upload(image, "image/png");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "cimage123", url: "/api/images/cimage123" });
    expect(mocks.create).toHaveBeenCalledWith({ data: { mime: "image/png", data: image, size: image.length } });
  });

  it("sirve los bytes con caché y protección de tipo; devuelve 404 si faltan", async () => {
    const request = new NextRequest("http://localhost/api/images/cimage123");
    const params = { params: Promise.resolve({ id: "cimage123" }) };
    mocks.find.mockResolvedValue(null);
    expect((await GET(request, params)).status).toBe(404);
    mocks.find.mockResolvedValue({ mime: "image/png", data: Buffer.from([1, 2]), size: 2 });
    const response = await GET(request, params);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2]));
  });
});
