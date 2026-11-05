import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set }) }));
import { authenticateAdmin, authenticateByCode, getSession } from "./auth";
import { getAuthSecret } from "./session-config";
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("AUTH_SECRET", "test-only-secret-with-at-least-32-bytes"); });
describe("autenticación cerrada ante errores", () => {
  it.each([null, new Error("offline")])("no admite credenciales demo sin cuenta: %s", async (value) => {
    if (value instanceof Error) mocks.findUnique.mockRejectedValue(value);
    else mocks.findUnique.mockResolvedValue(value);
    expect((await authenticateAdmin("admin@certamen.bo", "admin2026")).success).toBe(false);
    expect((await authenticateByCode("JUR-01", "1234")).success).toBe(false);
  });
  it.each([undefined, "short", "change-me-in-production-use-openssl-rand-base64-32"])("rechaza clave insegura %s", secret => {
    vi.stubEnv("AUTH_SECRET", secret); expect(() => getAuthSecret()).toThrow();
  });
  it.each([
    [2, { id: "u", name: "Admin", role: "ADMIN", isActive: true }, true],
    [1, { id: "u", role: "ADMIN", isActive: true }, false],
    [2, { id: "u", role: "ADMIN", isActive: false }, false],
    [2, { id: "u", role: "JURADO", isActive: true }, false],
    [2, null, false],
  ])("valida versión y cuenta %s %j", async (version, user, allowed) => {
    const token = await new SignJWT({ userId: "u", role: "ADMIN", sessionVersion: version }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1m").sign(getAuthSecret());
    mocks.get.mockReturnValue({ value: token }); mocks.findUnique.mockResolvedValue(user);
    expect(Boolean(await getSession())).toBe(allowed);
    mocks.findUnique.mockRejectedValue(new Error("offline"));
    expect(await getSession()).toBeNull();
  });
});
