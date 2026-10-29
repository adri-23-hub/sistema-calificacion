"use server";

import { authenticateByCode, authenticateAdmin, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginCodePinSchema, loginEmailPasswordSchema } from "@/lib/validations";

interface LoginResult {
  success: boolean;
  error?: string;
  redirect?: string;
}

/**
 * Login para JURADO y CONTROL (código + PIN)
 */
export async function loginCodePinAction(code: string, pin: string): Promise<LoginResult> {
  try {
    // Validar con Zod
    const parsed = loginCodePinSchema.safeParse({ code, pin });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const result = await authenticateByCode(parsed.data.code, parsed.data.pin);

    if (!result.success || !result.user) {
      // Auditar intento fallido
      try {
        const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } });
        if (edition) {
          await prisma.auditLog.create({
            data: {
              editionId: edition.id,
              type: "AUTH_LOGIN_FAILURE",
              entityType: "User",
              metadata: { code: parsed.data.code, reason: result.error },
            },
          });
        }
      } catch {}

      return { success: false, error: result.error || "Código o PIN incorrecto" };
    }

    await createSession(result.user);

    // Auditar login exitoso
    try {
      if (result.user.editionId) {
        await prisma.auditLog.create({
          data: {
            editionId: result.user.editionId,
            actorId: result.user.userId,
            type: "AUTH_LOGIN_SUCCESS",
            entityType: "User",
            entityId: result.user.userId,
            metadata: { role: result.user.role },
          },
        });
      }
    } catch {}

    // Redirigir según rol
    const redirect = result.user.role === "CONTROL" ? "/control" : "/jurado";
    return { success: true, redirect };
  } catch (error) {
    console.error("Error inesperado en loginCodePinAction:", error);
    return { success: false, error: "Error en el servidor al procesar el inicio de sesión." };
  }
}

// Backward compatibility
export const loginJuryAction = loginCodePinAction;

/**
 * Login para ADMIN y NOTARIO (email + contraseña)
 */
export async function loginAdminAction(email: string, password: string): Promise<LoginResult> {
  try {
    // Validar con Zod
    const parsed = loginEmailPasswordSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const result = await authenticateAdmin(parsed.data.email, password);

    if (!result.success || !result.user) {
      return { success: false, error: result.error || "Credenciales incorrectas" };
    }

    await createSession(result.user);

    // Auditar login exitoso
    try {
      if (result.user.editionId) {
        await prisma.auditLog.create({
          data: {
            editionId: result.user.editionId,
            actorId: result.user.userId,
            type: "AUTH_LOGIN_SUCCESS",
            entityType: "User",
            entityId: result.user.userId,
            metadata: { role: result.user.role },
          },
        });
      }
    } catch {}

    const redirect = result.user.role === "NOTARIO" ? "/notaria" : "/admin";
    return { success: true, redirect };
  } catch (error) {
    console.error("Error inesperado en loginAdminAction:", error);
    return { success: false, error: "Error en el servidor al procesar el inicio de sesión." };
  }
}
