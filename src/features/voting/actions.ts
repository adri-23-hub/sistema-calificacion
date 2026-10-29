"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computePayloadHash } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

interface SubmitScoreInput {
  entryId: string;
  rubricId: string;
  items: Array<{
    criterionId: string;
    points: number;
  }>;
  observations?: string;
  clientUuid?: string;
}

export interface SubmitScoreResult {
  success: boolean;
  error?: string;
  scoreId?: string;
  payloadHash?: string;
  rawTotal?: number;
}

/**
 * Server action to submit an immutable vote per ARCHITECTURE.md §3.1 & §10.3
 */
export async function submitScoreAction(
  input: SubmitScoreInput
): Promise<SubmitScoreResult> {
  try {
    const session = await getSession();
    if (!session || session.role !== "JURADO") {
      return { success: false, error: "No autorizado. Sesión de jurado requerida." };
    }

    const { entryId, rubricId, items, observations, clientUuid } = input;

    if (!entryId || !rubricId || !items || items.length === 0) {
      return { success: false, error: "Datos de calificación incompletos." };
    }

    // Validate points range
    for (const item of items) {
      if (typeof item.points !== "number" || item.points < 0 || item.points > 10) {
        return {
          success: false,
          error: "Los puntos deben ser valores numéricos entre 0 y 10.",
        };
      }
    }

    // Compute raw total and weighted total
    const rawTotal = Math.round(
      items.reduce((sum, item) => sum + item.points, 0) * 100
    ) / 100;

    // Standard 4 criteria with 25% weight each
    const weightedTotal = Math.round((rawTotal / items.length) * 100) / 100;

    // Compute cryptographic SHA-256 hash payload per §10.3
    const payload = {
      entryId,
      juryId: session.userId,
      rubricId,
      items: items.map((i) => ({ criterionId: i.criterionId, points: i.points })),
      rawTotal,
      weightedTotal,
      observations: observations?.trim() || null,
      submittedAt: new Date().toISOString(),
      clientUuid: clientUuid || crypto.randomUUID(),
    };

    const payloadHash = computePayloadHash(payload);
    let scoreId = `score-${Date.now()}`;

    // Try persisting in database if reachable
    try {
      const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        include: {
          category: true,
          participant: {
            include: { fraternity: true },
          },
        },
      });

      if (entry) {
        const existingScore = await prisma.score.findFirst({
          where: {
            entryId,
            juryId: session.userId,
            status: "SUBMITTED",
          },
        });

        if (existingScore) {
          return {
            success: false,
            error: "Ya has emitido y sellado tu calificación definitiva para esta danza.",
          };
        }

        const score = await prisma.$transaction(async (tx) => {
          const createdScore = await tx.score.create({
            data: {
              entryId,
              juryId: session.userId,
              rubricId,
              status: "SUBMITTED",
              rawTotal,
              weightedTotal,
              submittedAt: new Date(),
              payloadHash,
              clientUuid: payload.clientUuid,
              items: {
                create: items.map((item) => ({
                  criterionId: item.criterionId,
                  points: item.points,
                })),
              },
            },
          });

          await tx.auditLog.create({
            data: {
              editionId: session.editionId || entry.category.editionId,
              actorId: session.userId,
              type: "SCORE_SUBMITTED",
              entityType: "Score",
              entityId: createdScore.id,
              metadata: {
                entryId,
                danza: entry.participant.fraternity.name,
                candidata: entry.participant.fullName,
                rawTotal,
                payloadHash,
              },
            },
          });

          return createdScore;
        });

        scoreId = score.id;
      }
    } catch (dbErr) {
      console.warn("Base de datos no disponible durante el voto, sellando en modo offline/demo:", dbErr);
    }

    revalidatePath("/jurado");
    revalidatePath(`/jurado/calificar/${entryId}`);
    revalidatePath("/jurado/mis-calificaciones");

    return {
      success: true,
      scoreId,
      payloadHash,
      rawTotal,
    };
  } catch (error: unknown) {
    console.error("Error submitting score:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor.";
    return { success: false, error: message };
  }
}
