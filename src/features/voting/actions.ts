"use server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computePayloadHash } from "@/lib/crypto";
import { lockEdition, requireJuryAssignment } from "@/lib/vote-authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";
const inputSchema = z.object({ entryId: z.string().min(1), rubricId: z.string().min(1), items: z.array(z.object({ criterionId: z.string().min(1), points: z.number().finite().min(0) })).min(1), observations: z.string().max(2000).optional(), clientUuid: z.string().max(100).optional() });
type SubmitScoreInput = z.infer<typeof inputSchema>;
export interface SubmitScoreResult { success: boolean; error?: string; scoreId?: string; payloadHash?: string; rawTotal?: number; }
export async function submitScoreAction(input: SubmitScoreInput): Promise<SubmitScoreResult> {
  try {
    const session = await getSession();
    if (!session || session.role !== "JURADO") return { success: false, error: "Sesión de jurado requerida." };
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Datos de calificación inválidos." };
    const { entryId, rubricId, items, observations, clientUuid } = parsed.data;
    const result = await prisma.$transaction(async tx => {
      const initial = await tx.entry.findUnique({ where: { id: entryId }, include: { category: true } });
      if (!initial) throw new Error("Participación no encontrada.");
      await lockEdition(tx, initial.category.editionId);
      const entry = await tx.entry.findUnique({ where: { id: entryId }, include: { category: { include: { edition: true } }, participant: true, runway: true } });
      if (!entry) throw new Error("Participación no encontrada.");
      await requireJuryAssignment(tx, session.userId, entry.category.editionId, "MOPERITA_NUSTA");
      const existing = await tx.score.findFirst({ where: { entryId, juryId: session.userId, status: "SUBMITTED" }, include: { items: true } });
      if (existing) {
        if (clientUuid && existing.clientUuid === clientUuid && existing.rubricId === rubricId && existing.items.length === items.length && existing.items.every(i => items.some(j => j.criterionId === i.criterionId && j.points === i.points))) return { success: true, scoreId: existing.id, payloadHash: existing.payloadHash ?? undefined, rawTotal: existing.rawTotal ?? undefined };
        throw new Error("Ya existe una calificación definitiva para esta participación.");
      }
      const now = new Date();
      if (entry.category.moduleType !== "MOPERITA_NUSTA" || !["OPEN", "VOTING"].includes(entry.category.status) || entry.status !== "IN_SCORING" || !entry.participant.isActive || (entry.votingOpensAt && now < entry.votingOpensAt) || (entry.votingClosesAt && now >= entry.votingClosesAt)) throw new Error("La votación de esta participación no está abierta.");
      if (entry.category.activeRubricId !== rubricId) throw new Error("La rúbrica no es la vigente.");
      const rubric = await tx.rubric.findUnique({ where: { id: rubricId }, include: { criteria: true } });
      if (!rubric || rubric.status !== "ACTIVE" || rubric.categoryId !== entry.categoryId) throw new Error("Rúbrica inválida.");
      const criteria = rubric.criteria.filter(c => !c.appliesToRunway || c.appliesToRunway === entry.runway?.type);
      if (new Set(items.map(i => i.criterionId)).size !== items.length || items.length !== criteria.length || criteria.some(c => !items.some(i => i.criterionId === c.id && i.points <= c.maxPoints))) throw new Error("Se requieren todos los criterios válidos, sin duplicados y dentro de sus límites.");
      const rawTotal = Math.round(items.reduce((sum,i) => sum+i.points,0)*100)/100;
      const sumWeights = criteria.reduce((sum,c) => sum+c.weight,0);
      if (!(sumWeights > 0)) throw new Error("Pesos de rúbrica inválidos.");
      const weightedTotal = Math.round(criteria.reduce((sum,c) => sum+items.find(i => i.criterionId === c.id)!.points*c.weight,0)/sumWeights*100)/100;
      const payload = { entryId, juryId: session.userId, rubricId, items: [...items].sort((a,b) => a.criterionId.localeCompare(b.criterionId)), rawTotal, weightedTotal, observations: observations?.trim() || null, submittedAt: now.toISOString(), clientUuid: clientUuid || crypto.randomUUID() };
      const payloadHash = computePayloadHash(payload);
      const score = await tx.score.create({ data: { entryId, juryId: session.userId, rubricId, status: "SUBMITTED", rawTotal, weightedTotal, submittedAt: now, payloadHash, clientUuid: payload.clientUuid, items: { create: items } } });
      await tx.auditLog.create({ data: { editionId: entry.category.editionId, actorId: session.userId, type: "SCORE_SUBMITTED", entityType: "Score", entityId: score.id, metadata: { payload, payloadHash, hashVersion: 2 } } });
      return { success: true, scoreId: score.id, payloadHash, rawTotal };
    });
    revalidatePath("/jurado");
    revalidatePath(`/jurado/calificar/${entryId}`);
    revalidatePath("/jurado/mis-calificaciones");
    return result;
  } catch (error) {
    console.error("No se pudo guardar la calificación:", error);
    return { success: false, error: "No se pudo guardar la calificación. Comprueba que la votación esté abierta y tu asignación sea válida; tus notas se conservan." };
  }
}
