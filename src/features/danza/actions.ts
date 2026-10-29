"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computePayloadHash } from "@/lib/crypto";
import { requirePermission } from "@/lib/rbac";
import { danceScoreSchema, penaltySchema, disqualifySchema, voidScoreSchema, voidPenaltySchema, arrivalRegistrationSchema } from "@/lib/validations";
import { calculateDanceJuryScore } from "@/lib/scoring";
import { revalidatePath } from "next/cache";

// ─── Enviar calificación de danza (JURADO) ──────────────────

export interface SubmitDanceScoreResult {
  success: boolean;
  error?: string;
  scoreId?: string;
  rawTotal?: number;
}

export async function submitDanceScoreAction(
  input: unknown
): Promise<SubmitDanceScoreResult> {
  try {
    const session = await requireSession(["JURADO"]);

    // Validar entrada con Zod
    const parsed = danceScoreSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { danceGroupId, coreografia, vestimenta, entusiasmo, observations, clientUuid } = parsed.data;

    // Calcular nota con función pura
    const rawTotal = calculateDanceJuryScore({ coreografia, vestimenta, entusiasmo });

    // Compute hash del payload
    const payloadHash = computePayloadHash({
      danceGroupId,
      juryId: session.userId,
      coreografia,
      vestimenta,
      entusiasmo,
      rawTotal,
      submittedAt: new Date().toISOString(),
    });

    // Transacción atómica para la regla de voto único
    const score = await prisma.$transaction(async (tx) => {
      // Verificar que el grupo existe y está en calificación
      const group = await tx.danceGroup.findUnique({
        where: { id: danceGroupId },
        select: { id: true, status: true, isDisqualified: true, editionId: true },
      });

      if (!group) {
        throw new Error("Grupo de danza no encontrado");
      }
      if (group.isDisqualified) {
        throw new Error("Este grupo ha sido descalificado");
      }
      if (group.status === "CLOSED") {
        throw new Error("La calificación de este grupo ya está cerrada");
      }
      if (group.status === "PENDING") {
        throw new Error("Este grupo aún no está en calificación");
      }

      // Verificar voto único (constraint DB + check explícito)
      const existing = await tx.danceScore.findFirst({
        where: {
          danceGroupId,
          juryId: session.userId,
          status: "SUBMITTED",
        },
      });

      if (existing) {
        throw new Error("Ya emitiste tu calificación para este grupo. El voto es irrevocable.");
      }

      // Crear el voto inmutable
      const created = await tx.danceScore.create({
        data: {
          danceGroupId,
          juryId: session.userId,
          coreografia,
          vestimenta,
          entusiasmo,
          rawTotal,
          status: "SUBMITTED",
          observations: observations?.trim() || null,
          payloadHash,
          clientUuid: clientUuid || crypto.randomUUID(),
        },
      });

      // Registrar en auditoría
      await tx.auditLog.create({
        data: {
          editionId: group.editionId,
          actorId: session.userId,
          type: "DANCE_SCORE_SUBMITTED",
          entityType: "DanceScore",
          entityId: created.id,
          metadata: {
            danceGroupId,
            coreografia,
            vestimenta,
            entusiasmo,
            rawTotal,
            payloadHash,
          },
        },
      });

      return created;
    });

    revalidatePath("/jurado");
    return { success: true, scoreId: score.id, rawTotal };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Registrar penalización (CONTROL o ADMIN) ───────────────

export interface RegisterPenaltyResult {
  success: boolean;
  error?: string;
  penaltyId?: string;
}

export async function registerPenaltyAction(
  input: unknown
): Promise<RegisterPenaltyResult> {
  try {
    const session = await requireSession(["CONTROL", "ADMIN"]);
    requirePermission(session.role, "penalties:register");

    // Solo ADMIN puede descalificar
    const parsed = penaltySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { danceGroupId, type, points, observation } = parsed.data;

    if (type === "DISQUALIFICATION" && session.role !== "ADMIN") {
      return { success: false, error: "Solo un administrador puede descalificar" };
    }

    const penalty = await prisma.$transaction(async (tx) => {
      const group = await tx.danceGroup.findUnique({
        where: { id: danceGroupId },
        select: { id: true, editionId: true, isDisqualified: true },
      });

      if (!group) throw new Error("Grupo no encontrado");
      if (group.isDisqualified) throw new Error("El grupo ya está descalificado");

      // Calcular puntos automáticos según tipo
      let penaltyPoints = points || 0;
      if (type === "YELLOW_FLAG") penaltyPoints = 0; // se calculan acumulativamente
      if (type === "RED_FLAG") penaltyPoints = 10;
      if (type === "ORDER_VIOLATION") penaltyPoints = 5;

      const created = await tx.penalty.create({
        data: {
          danceGroupId,
          type,
          points: penaltyPoints,
          observation,
          registeredBy: session.userId,
        },
      });

      // Si es descalificación, marcar el grupo
      if (type === "DISQUALIFICATION") {
        await tx.danceGroup.update({
          where: { id: danceGroupId },
          data: {
            isDisqualified: true,
            disqualifyReason: observation,
            disqualifiedAt: new Date(),
            disqualifiedBy: session.userId,
          },
        });
      }

      // Auditoría
      await tx.auditLog.create({
        data: {
          editionId: group.editionId,
          actorId: session.userId,
          type: type === "DISQUALIFICATION" ? "DISQUALIFICATION" : "PENALTY_REGISTERED",
          entityType: type === "DISQUALIFICATION" ? "DanceGroup" : "Penalty",
          entityId: type === "DISQUALIFICATION" ? danceGroupId : created.id,
          metadata: { type, points: penaltyPoints, observation },
        },
      });

      return created;
    });

    revalidatePath("/control");
    revalidatePath("/admin");
    return { success: true, penaltyId: penalty.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Anular penalización (solo ADMIN) ───────────────────────

export async function voidPenaltyAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "penalties:void");

    const parsed = voidPenaltySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { penaltyId, reason } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const penalty = await tx.penalty.findUnique({
        where: { id: penaltyId },
        include: { danceGroup: { select: { editionId: true } } },
      });

      if (!penalty) throw new Error("Penalización no encontrada");
      if (penalty.isVoided) throw new Error("La penalización ya está anulada");

      await tx.penalty.update({
        where: { id: penaltyId },
        data: {
          isVoided: true,
          voidedAt: new Date(),
          voidReason: reason,
          voidedBy: session.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: penalty.danceGroup.editionId,
          actorId: session.userId,
          type: "PENALTY_VOIDED",
          entityType: "Penalty",
          entityId: penaltyId,
          metadata: { reason, originalType: penalty.type },
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

// ─── Anular voto de danza (solo ADMIN) ──────────────────────

export async function voidDanceScoreAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);

    const parsed = voidScoreSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { scoreId, reason } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const score = await tx.danceScore.findUnique({
        where: { id: scoreId },
        include: { danceGroup: { select: { editionId: true } } },
      });

      if (!score) throw new Error("Voto no encontrado");
      if (score.status === "VOID") throw new Error("El voto ya está anulado");

      await tx.danceScore.update({
        where: { id: scoreId },
        data: {
          status: "VOID",
          voidedAt: new Date(),
          voidReason: reason,
          voidedBy: session.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: score.danceGroup.editionId,
          actorId: session.userId,
          type: "DANCE_SCORE_VOIDED",
          entityType: "DanceScore",
          entityId: scoreId,
          metadata: { reason, juryId: score.juryId, danceGroupId: score.danceGroupId },
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

// ─── Registrar hora de llegada (CONTROL o ADMIN) ────────────

export async function registerArrivalAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["CONTROL", "ADMIN"]);
    requirePermission(session.role, "control:register_arrival");

    const parsed = arrivalRegistrationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { danceGroupId, arrivalTime } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const group = await tx.danceGroup.findUnique({
        where: { id: danceGroupId },
        select: { id: true, editionId: true, arrivalTime: true },
      });

      if (!group) throw new Error("Grupo no encontrado");
      if (group.arrivalTime) throw new Error("La hora de llegada ya fue registrada");

      await tx.danceGroup.update({
        where: { id: danceGroupId },
        data: {
          arrivalTime: arrivalTime ? new Date(arrivalTime) : new Date(),
          arrivalRegisteredBy: session.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: group.editionId,
          actorId: session.userId,
          type: "ARRIVAL_REGISTERED",
          entityType: "DanceGroup",
          entityId: danceGroupId,
          metadata: { arrivalTime: arrivalTime || new Date().toISOString() },
        },
      });
    });

    revalidatePath("/control");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Cambiar estado de grupo de danza (ADMIN) ───────────────

export async function changeDanceGroupStatusAction(
  danceGroupId: string,
  newStatus: "PENDING" | "IN_SCORING" | "CLOSED"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);

    await prisma.$transaction(async (tx) => {
      const group = await tx.danceGroup.findUnique({
        where: { id: danceGroupId },
        select: { id: true, editionId: true, status: true },
      });

      if (!group) throw new Error("Grupo no encontrado");

      await tx.danceGroup.update({
        where: { id: danceGroupId },
        data: { status: newStatus },
      });

      await tx.auditLog.create({
        data: {
          editionId: group.editionId,
          actorId: session.userId,
          type: "GROUP_STATUS_CHANGED",
          entityType: "DanceGroup",
          entityId: danceGroupId,
          metadata: { oldStatus: group.status, newStatus },
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

// ─── Descalificar grupo (exclusivo ADMIN) ───────────────────

export async function disqualifyGroupAction(input: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "groups:disqualify");

    const parsed = disqualifySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { danceGroupId, reason } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const group = await tx.danceGroup.findUnique({ where: { id: danceGroupId } });
      if (!group) throw new Error("Grupo de danza no encontrado");

      await tx.danceGroup.update({
        where: { id: danceGroupId },
        data: {
          isDisqualified: true,
          disqualifyReason: reason.trim(),
          disqualifiedAt: new Date(),
          disqualifiedBy: session.userId,
        },
      });

      await tx.penalty.create({
        data: {
          danceGroupId,
          type: "DISQUALIFICATION",
          points: 0,
          observation: reason.trim(),
          registeredBy: session.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: group.editionId,
          actorId: session.userId,
          type: "DISQUALIFICATION",
          entityType: "DanceGroup",
          entityId: danceGroupId,
          metadata: { reason: reason.trim(), disqualifiedBy: session.userId },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/control");
    revalidatePath("/resultados");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

export async function changeGroupStatusAction(params: {
  danceGroupId: string;
  status: "PENDING" | "IN_SCORING" | "CLOSED";
}): Promise<{ success: boolean; error?: string }> {
  return changeDanceGroupStatusAction(params.danceGroupId, params.status);
}

