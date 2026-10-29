"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import type { PenaltySummary } from "@/lib/scoring";

// ─── Confirmar apertura oficial (ADMIN) ─────────────────────

export async function confirmOpeningAdminAction(
  editionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "opening:confirm_admin");

    await prisma.$transaction(async (tx) => {
      const edition = await tx.edition.findUnique({ where: { id: editionId } });
      if (!edition) throw new Error("Edición no encontrada");
      if (edition.adminConfirmedAt) throw new Error("El administrador ya confirmó la apertura");

      await tx.edition.update({
        where: { id: editionId },
        data: {
          adminConfirmedAt: new Date(),
          adminConfirmedBy: session.userId,
          // Si el notario ya confirmó, revelar resultados
          resultsRevealed: edition.notaryConfirmedAt !== null,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId,
          actorId: session.userId,
          type: "OPENING_ADMIN_CONFIRMED",
          entityType: "Edition",
          entityId: editionId,
          metadata: { confirmedAt: new Date().toISOString() },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/notaria");
    revalidatePath("/resultados");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Confirmar apertura oficial (NOTARIO) ───────────────────

export async function confirmOpeningNotaryAction(
  editionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["NOTARIO"]);
    requirePermission(session.role, "opening:confirm_notary");

    await prisma.$transaction(async (tx) => {
      const edition = await tx.edition.findUnique({ where: { id: editionId } });
      if (!edition) throw new Error("Edición no encontrada");
      if (edition.notaryConfirmedAt) throw new Error("El notario ya confirmó la apertura");

      await tx.edition.update({
        where: { id: editionId },
        data: {
          notaryConfirmedAt: new Date(),
          notaryConfirmedBy: session.userId,
          // Si el admin ya confirmó, revelar resultados
          resultsRevealed: edition.adminConfirmedAt !== null,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId,
          actorId: session.userId,
          type: "OPENING_NOTARY_CONFIRMED",
          entityType: "Edition",
          entityId: editionId,
          metadata: { confirmedAt: new Date().toISOString() },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/notaria");
    revalidatePath("/resultados");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Guardar configuración del evento (ADMIN) ───────────────

export async function saveEventConfigAction(
  editionId: string,
  key: string,
  value: unknown,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "config:write");

    // Verificar si hay votos existentes para claves de pesos/escalas
    const lockedKeys = [
      "moduleA.criteria.weights",
      "moduleA.criteria.scale",
      "moduleB.criteria.weights",
      "moduleB.runway.weights",
      "moduleB.criteria.scale",
    ];

    if (lockedKeys.includes(key)) {
      // Verificar si hay votos en el sistema
      const [danceScoreCount, scoreCount] = await Promise.all([
        prisma.danceScore.count({ where: { danceGroup: { editionId }, status: "SUBMITTED" } }),
        prisma.score.count({ where: { entry: { category: { editionId } }, status: "SUBMITTED" } }),
      ]);

      if (danceScoreCount > 0 || scoreCount > 0) {
        return {
          success: false,
          error: "No se pueden modificar pesos/escalas mientras existen votos enviados. Anule los votos primero o confirme el cambio explícitamente.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      const jsonValue = value as Prisma.InputJsonValue;
      await tx.eventConfig.upsert({
        where: { editionId_key: { editionId, key } },
        create: { editionId, key, value: jsonValue, description },
        update: { value: jsonValue, description },
      });

      await tx.auditLog.create({
        data: {
          editionId,
          actorId: session.userId,
          type: "CONFIG_CHANGED",
          entityType: "EventConfig",
          entityId: key,
          metadata: { key, value: jsonValue, description },
        },
      });
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Obtener configuración del evento ───────────────────────

export async function getEventConfigAction(
  editionId: string
): Promise<{ success: boolean; configs?: Record<string, unknown>; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "config:read");

    const configs = await prisma.eventConfig.findMany({
      where: { editionId },
    });

    const configMap: Record<string, unknown> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    return { success: true, configs: configMap };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Obtener resultados (con protección "sobre cerrado") ────

export interface GroupResult {
  id: string;
  danceName: string;
  fraternityName: string;
  university: string;
  finalScore: number;
  average: number;
  penaltyTotal: number;
  isDisqualified: boolean;
  rank?: number;
  // Solo si resultsRevealed = true:
  juryScores?: Array<{
    juryName: string;
    coreografia: number;
    vestimenta: number;
    entusiasmo: number;
    rawTotal: number;
  }>;
  penalties?: Array<{
    type: string;
    points: number;
    observation: string | null;
    registeredAt: Date;
  }>;
}

export async function getDanceResultsAction(
  editionId: string
): Promise<{ success: boolean; results?: GroupResult[]; resultsRevealed?: boolean; error?: string }> {
  try {
    const session = await requireSession();

    // Verificar si los resultados están revelados
    const edition = await prisma.edition.findUnique({
      where: { id: editionId },
      select: { resultsRevealed: true, adminConfirmedAt: true, notaryConfirmedAt: true },
    });

    if (!edition) return { success: false, error: "Edición no encontrada" };

    const resultsRevealed = edition.resultsRevealed;

    // CONTROL y JURADO nunca ven notas antes de la apertura
    if (!resultsRevealed && (session.role === "CONTROL" || session.role === "JURADO")) {
      return {
        success: true,
        results: [],
        resultsRevealed: false,
      };
    }

    // Modo "sobre cerrado": ni ADMIN ni NOTARIO ven notas antes de la apertura
    if (!resultsRevealed) {
      return {
        success: true,
        results: [],
        resultsRevealed: false,
      };
    }

    // Resultados revelados — construir ranking
    const groups = await prisma.danceGroup.findMany({
      where: { editionId },
      include: {
        fraternity: true,
        danceScores: {
          where: { status: "SUBMITTED" },
          include: { jury: { select: { name: true } } },
        },
        penalties: {
          where: { isVoided: false },
        },
      },
      orderBy: { entryOrder: "asc" },
    });

    const { calculateDanceGroupFinalScore } = await import("@/lib/scoring");

    const results: GroupResult[] = groups.map((group) => {
      const juryScores = group.danceScores.map((s) => ({
        coreografia: s.coreografia,
        vestimenta: s.vestimenta,
        entusiasmo: s.entusiasmo,
      }));

      const penaltySummary: PenaltySummary = {
        yellowFlags: group.penalties.filter((p) => p.type === "YELLOW_FLAG").length,
        redFlags: group.penalties.filter((p) => p.type === "RED_FLAG").length,
        orderViolation: group.penalties.some((p) => p.type === "ORDER_VIOLATION"),
        manualDeductions: group.penalties
          .filter((p) => p.type === "MANUAL_DEDUCTION")
          .reduce((s, p) => s + p.points, 0),
      };

      const result = calculateDanceGroupFinalScore(juryScores, penaltySummary);

      return {
        id: group.id,
        danceName: group.danceName,
        fraternityName: group.fraternity.name,
        university: group.fraternity.university,
        finalScore: result.finalScore,
        average: result.average,
        penaltyTotal: result.penaltyTotal,
        isDisqualified: group.isDisqualified,
        juryScores: group.danceScores.map((s) => ({
          juryName: s.jury.name,
          coreografia: s.coreografia,
          vestimenta: s.vestimenta,
          entusiasmo: s.entusiasmo,
          rawTotal: s.rawTotal,
        })),
        penalties: group.penalties.map((p) => ({
          type: p.type,
          points: p.points,
          observation: p.observation,
          registeredAt: p.registeredAt,
        })),
      };
    });

    // Ordenar: descalificados al final, luego por nota final descendente
    results.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      return b.finalScore - a.finalScore;
    });

    // Asignar ranking (sin descalificados)
    let rank = 1;
    for (const r of results) {
      if (!r.isDisqualified) {
        r.rank = rank++;
      }
    }

    return { success: true, results, resultsRevealed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Alias para UI ──────────────────────────────────────────

export async function updateEventConfigAction(params: {
  editionId: string;
  key: string;
  value: unknown;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  return saveEventConfigAction(params.editionId, params.key, params.value, params.description);
}

