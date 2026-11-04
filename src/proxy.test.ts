import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("protección de rutas tras migrar a Proxy", () => {
  it.each([
    ["ADMIN", "/admin", true],
    ["ADMIN", "/control", true],
    ["JURADO", "/jurado/danzas", true],
    ["JURADO", "/admin", false],
    ["CONTROL", "/control", true],
    ["CONTROL", "/jurado/danzas", false],
    ["NOTARIO", "/notaria", true],
    ["NOTARIO", "/admin", false],
  ])("rol %s en %s conserva acceso=%s", async (role, path, allowed) => {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-in-production");
    const token = await new SignJWT({ role, userId: "test-user" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1m").sign(secret);
    const response = await proxy(new NextRequest("http://localhost" + path, { headers: { cookie: "session=" + token } }));
    expect(response.headers.get("location")).toBe(allowed ? null : "http://localhost/login");
  });

  it("redirige al login sin sesión", async () => {
    const response = await proxy(new NextRequest("http://localhost/admin"));
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("rechaza una sesión inválida y elimina su cookie", async () => {
    const response = await proxy(new NextRequest("http://localhost/admin", { headers: { cookie: "session=invalid" } }));
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.cookies.get("session")?.value).toBe("");
  });
});
