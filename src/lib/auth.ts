import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";

import { getAuthSecret, SESSION_VERSION } from "@/lib/session-config";

// ─── Rate limiting config ───────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;       // intentos antes del bloqueo
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

export interface SessionPayload {
  userId: string;
  name: string;
  role: Role;
  editionId?: string;
  code?: string;
}

/**
 * Create a JWT session token and set it as an HTTP-only cookie.
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload, sessionVersion: SESSION_VERSION })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h") // 12-hour sessions
    .sign(getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  });

  return token;
}

/**
 * Retrieve and verify the current session from cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), { algorithms: ["HS256"] });
    if (payload.sessionVersion !== SESSION_VERSION || typeof payload.userId !== "string") return null;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive || user.role !== payload.role) return null;
    if (user.isLocked && (!user.lockedUntil || user.lockedUntil > new Date())) return null;
    return { userId: user.id, name: user.name, role: user.role,
      editionId: typeof payload.editionId === "string" ? payload.editionId : undefined,
      code: user.code ?? undefined };
  } catch {
    return null;
  }
}

/**
 * Require a valid session with a specific role. Throws if not authorized.
 */
export async function requireSession(allowedRoles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("No autorizado: sesión requerida");
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error(`No autorizado: rol ${session.role} no permitido`);
  }
  return session;
}

/**
 * Destroy the current session.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// ─── Login Attempt Tracking ─────────────────────────────────

/**
 * Check if a user is currently locked out due to failed attempts.
 * Returns true if locked.
 */
async function checkLockout(userId: string): Promise<{ locked: boolean; remainingMs?: number }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isLocked: true, lockedUntil: true, failedAttempts: true },
    });

    if (!user) return { locked: true };

    if (user.isLocked && !user.lockedUntil) return { locked: true };
    if (user.isLocked && user.lockedUntil) {
      const now = new Date();
      if (now < user.lockedUntil) {
        return { locked: true, remainingMs: user.lockedUntil.getTime() - now.getTime() };
      }
      // Lockout expired, reset
      await prisma.user.update({
        where: { id: userId },
        data: { isLocked: false, lockedUntil: null, failedAttempts: 0 },
      });
    }

    return { locked: false };
  } catch {
    return { locked: true };
  }
}

/**
 * Record a failed login attempt and potentially lock the account.
 */
async function recordFailedAttempt(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedAttempts: true },
    });

    if (!user) return;

    const newAttempts = user.failedAttempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: newAttempts,
        isLocked: shouldLock,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });
  } catch {
    // Silently fail if DB is down
  }
}

/**
 * Reset failed attempts on successful login.
 */
async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, isLocked: false, lockedUntil: null, lastLoginAt: new Date() },
    });
  } catch {
    // Silently fail if DB is down
  }
}

/**
 * Authenticate a jury member or control staff by code + PIN.
 */
export async function authenticateByCode(
  code: string,
  pin: string
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  const cleanCode = code.toUpperCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { code: cleanCode },
      include: {
        juryAssignments: {
          where: { isActive: true },
          include: { edition: true },
          take: 1,
        },
      },
    });

    if (user && (user.role === "JURADO" || user.role === "CONTROL")) {
      if (!user.isActive) {
        return { success: false, error: "Cuenta desactivada" };
      }

      // Check lockout
      const lockout = await checkLockout(user.id);
      if (lockout.locked) {
        const remainingMin = Math.ceil((lockout.remainingMs || 0) / 60000);
        return { success: false, error: `Cuenta bloqueada. Intenta en ${remainingMin} minutos.` };
      }

      if (!user.pinHash) {
        return { success: false, error: "PIN no configurado" };
      }

      const validPin = await verifyPassword(pin, user.pinHash);
      if (!validPin) {
        await recordFailedAttempt(user.id);
        return { success: false, error: "PIN incorrecto" };
      }

      await resetFailedAttempts(user.id);

      const assignment = user.juryAssignments[0];

      return {
        success: true,
        user: {
          userId: user.id,
          name: user.name,
          role: user.role,
          editionId: assignment?.editionId || "edition-2026",
          code: user.code ?? undefined,
        },
      };
    }
  } catch (error) {
    console.warn("Base de datos no accesible en authenticateByCode, acceso rechazado:", error);
  }

  return { success: false, error: "Código no encontrado. Ej: JUR-01 o CTRL-01" };
}

// Keep backward compatibility
export const authenticateJury = authenticateByCode;

/**
 * Authenticate admin/notary by email + password.
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  const cleanEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user && (user.role === "ADMIN" || user.role === "NOTARIO")) {
      if (!user.isActive) {
        return { success: false, error: "Cuenta desactivada" };
      }

      // Check lockout
      const lockout = await checkLockout(user.id);
      if (lockout.locked) {
        const remainingMin = Math.ceil((lockout.remainingMs || 0) / 60000);
        return { success: false, error: `Cuenta bloqueada. Intenta en ${remainingMin} minutos.` };
      }

      if (!user.passwordHash) {
        return { success: false, error: "Contraseña no configurada" };
      }

      const validPassword = await verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        await recordFailedAttempt(user.id);
        return { success: false, error: "Contraseña incorrecta" };
      }

      await resetFailedAttempts(user.id);

      return {
        success: true,
        user: {
          userId: user.id,
          name: user.name,
          role: user.role,
          editionId: "edition-2026",
        },
      };
    }
  } catch (error) {
    console.warn("Base de datos no accesible en authenticateAdmin, acceso rechazado:", error);
  }

  return { success: false, error: "Credenciales de administrador incorrectas" };
}
