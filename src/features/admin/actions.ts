"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireActiveEdition } from "@/lib/active-edition";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import {
  danceGroupSchema,
  fraternitySchema,
  participantPhotoSchema,
  participantSchema,
} from "@/lib/validations";
import type { RegisteredCandidate } from "@/features/admin/candidate-types";

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

    // Validar suma del 100% para pesos si aplica
    if (key === "moduleA.weights" || key === "moduleA.criteria.weights") {
      const v = value as Record<string, number>;
      const sum = (Number(v.coreografia) || 0) + (Number(v.vestimenta) || 0) + (Number(v.entusiasmo) || 0);
      const isPercent = sum > 1.5;
      const target = isPercent ? 100 : 1.0;
      const tol = isPercent ? 1 : 0.01;
      if (Math.abs(sum - target) > tol) {
        return { success: false, error: `Los pesos de la Entrada Folklórica deben sumar 100% (suma actual: ${sum}%).` };
      }
    }

    if (key === "moduleB.criteria.weights") {
      const v = value as Record<string, number>;
      const sum =
        (Number(v.porteElegancia) || 0) +
        (Number(v.carismaSimpatia) || 0) +
        (Number(v.autenticidadTraje) || 0) +
        (Number(v.originalidadEstilo) || 0);
      const isPercent = sum > 1.5;
      const target = isPercent ? 100 : 1.0;
      const tol = isPercent ? 1 : 0.01;
      if (Math.abs(sum - target) > tol) {
        return { success: false, error: `Los pesos de los 4 criterios de Moperita/Ñusta deben sumar 100% (suma actual: ${sum}%).` };
      }
    }

    if (key === "moduleB.runway.weights") {
      const v = value as Record<string, number>;
      const sum = (Number(v.GALA) || 0) + (Number(v.CASUAL) || 0) + (Number(v.TIPICA) || 0);
      const isPercent = sum > 1.5;
      const target = isPercent ? 100 : 1.0;
      const tol = isPercent ? 1 : 0.01;
      if (Math.abs(sum - target) > tol) {
        return { success: false, error: `Los pesos de las 3 pasadas deben sumar 100% (suma actual: ${sum}%).` };
      }
    }

    if (key === "moduleA.penalty.order" && value !== "BEFORE_AVERAGE" && value !== "AFTER_AVERAGE") {
      return { success: false, error: "El orden de penalizaciones debe ser 'BEFORE_AVERAGE' o 'AFTER_AVERAGE'." };
    }

    if (key === "general.scoringRule" && value !== "MEAN" && value !== "TRIMMED_MEAN") {
      return { success: false, error: "El método de agregación debe ser 'MEAN' o 'TRIMMED_MEAN'." };
    }

    if (key === "general.decimals") {
      const dec = Number(value);
      if (isNaN(dec) || dec < 0 || dec > 4) {
        return { success: false, error: "Los decimales de redondeo deben ser un número entre 0 y 4." };
      }
    }

    // Verificar si hay votos existentes para claves de pesos/escalas
    const lockedKeys = [
      "moduleA.weights",
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

// ─── Guardar todos los parámetros configurables en bloque (ADMIN) ────────

export interface AllConfigsInput {
  editionId: string;
  moduleAWeights: { coreografia: number; vestimenta: number; entusiasmo: number };
  penaltyOrder: "BEFORE_AVERAGE" | "AFTER_AVERAGE";
  moduleBCriteriaWeights: {
    porteElegancia: number;
    carismaSimpatia: number;
    autenticidadTraje: number;
    originalidadEstilo: number;
  };
  moduleBRunwayWeights: { GALA: number; CASUAL: number; TIPICA: number };
  scoringRule: "MEAN" | "TRIMMED_MEAN";
  decimals: number;
  juryCount: { moduleA: number; moduleB: number };
  tieBreakOrder: string[];
}

export async function saveAllEventConfigsAction(
  input: AllConfigsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "config:write");

    const {
      editionId,
      moduleAWeights,
      penaltyOrder,
      moduleBCriteriaWeights,
      moduleBRunwayWeights,
      scoringRule,
      decimals,
      juryCount,
      tieBreakOrder,
    } = input;

    // 1. Validar suma de Módulo A (100%)
    const sumA = moduleAWeights.coreografia + moduleAWeights.vestimenta + moduleAWeights.entusiasmo;
    if (Math.abs(sumA - 100) > 1 && Math.abs(sumA - 1.0) > 0.01) {
      return { success: false, error: `Los pesos de la Entrada Folklórica deben sumar 100% (suma: ${sumA}%).` };
    }

    // 2. Validar suma de 4 criterios Módulo B (100%)
    const sumBCriteria =
      moduleBCriteriaWeights.porteElegancia +
      moduleBCriteriaWeights.carismaSimpatia +
      moduleBCriteriaWeights.autenticidadTraje +
      moduleBCriteriaWeights.originalidadEstilo;
    if (Math.abs(sumBCriteria - 100) > 1 && Math.abs(sumBCriteria - 1.0) > 0.01) {
      return {
        success: false,
        error: `Los pesos de los 4 criterios de Moperita/Ñusta deben sumar 100% (suma: ${sumBCriteria}%).`,
      };
    }

    // 3. Validar suma de 3 pasadas Módulo B (100%)
    const sumBRunways =
      moduleBRunwayWeights.GALA + moduleBRunwayWeights.CASUAL + moduleBRunwayWeights.TIPICA;
    if (Math.abs(sumBRunways - 100) > 1 && Math.abs(sumBRunways - 1.0) > 0.01) {
      return {
        success: false,
        error: `Los pesos de las 3 pasadas deben sumar 100% (suma: ${sumBRunways}%).`,
      };
    }

    // 4. Validar orden de penalizaciones
    if (penaltyOrder !== "BEFORE_AVERAGE" && penaltyOrder !== "AFTER_AVERAGE") {
      return { success: false, error: "El orden de penalizaciones debe ser 'BEFORE_AVERAGE' o 'AFTER_AVERAGE'." };
    }

    // 5. Validar método de agregación
    if (scoringRule !== "MEAN" && scoringRule !== "TRIMMED_MEAN") {
      return { success: false, error: "El método de agregación debe ser 'MEAN' o 'TRIMMED_MEAN'." };
    }

    // 6. Validar decimales
    if (decimals < 0 || decimals > 4) {
      return { success: false, error: "Los decimales de redondeo deben estar entre 0 y 4." };
    }

    // 7. Validar jurados
    if (juryCount.moduleA < 1 || juryCount.moduleB < 1) {
      return { success: false, error: "El número de jurados por concurso debe ser al menos 1." };
    }

    // Normalizar a porcentajes / formato estándar
    const normA = {
      coreografia: moduleAWeights.coreografia > 1.5 ? moduleAWeights.coreografia / 100 : moduleAWeights.coreografia,
      vestimenta: moduleAWeights.vestimenta > 1.5 ? moduleAWeights.vestimenta / 100 : moduleAWeights.vestimenta,
      entusiasmo: moduleAWeights.entusiasmo > 1.5 ? moduleAWeights.entusiasmo / 100 : moduleAWeights.entusiasmo,
    };

    const normBCriteria = {
      porteElegancia:
        moduleBCriteriaWeights.porteElegancia > 1.5
          ? moduleBCriteriaWeights.porteElegancia / 100
          : moduleBCriteriaWeights.porteElegancia,
      carismaSimpatia:
        moduleBCriteriaWeights.carismaSimpatia > 1.5
          ? moduleBCriteriaWeights.carismaSimpatia / 100
          : moduleBCriteriaWeights.carismaSimpatia,
      autenticidadTraje:
        moduleBCriteriaWeights.autenticidadTraje > 1.5
          ? moduleBCriteriaWeights.autenticidadTraje / 100
          : moduleBCriteriaWeights.autenticidadTraje,
      originalidadEstilo:
        moduleBCriteriaWeights.originalidadEstilo > 1.5
          ? moduleBCriteriaWeights.originalidadEstilo / 100
          : moduleBCriteriaWeights.originalidadEstilo,
    };

    const normBRunways = {
      GALA: moduleBRunwayWeights.GALA > 1.5 ? moduleBRunwayWeights.GALA / 100 : moduleBRunwayWeights.GALA,
      CASUAL: moduleBRunwayWeights.CASUAL > 1.5 ? moduleBRunwayWeights.CASUAL / 100 : moduleBRunwayWeights.CASUAL,
      TIPICA: moduleBRunwayWeights.TIPICA > 1.5 ? moduleBRunwayWeights.TIPICA / 100 : moduleBRunwayWeights.TIPICA,
    };

    const configsToSave = [
      { key: "moduleA.weights", value: normA, desc: "Pesos de criterios — Módulo A (Coreografía, Vestimenta, Entusiasmo)" },
      { key: "moduleA.penalty.order", value: penaltyOrder, desc: "Orden de aplicación de penalizaciones (BEFORE_AVERAGE o AFTER_AVERAGE)" },
      { key: "moduleB.criteria.weights", value: normBCriteria, desc: "Ponderación de los 4 criterios de Moperita/Ñusta" },
      { key: "moduleB.runway.weights", value: normBRunways, desc: "Ponderación de las 3 pasadas (Gala, Casual, Típica)" },
      { key: "general.scoringRule", value: scoringRule, desc: "Método de agregación entre jurados (MEAN o TRIMMED_MEAN)" },
      { key: "general.decimals", value: decimals, desc: "Decimales de redondeo de notas" },
      { key: "general.juryCount", value: juryCount, desc: "Número de jurados por concurso" },
      { key: "general.tieBreak", value: tieBreakOrder, desc: "Criterio de desempate ordenado por prioridad" },
    ];

    await prisma.$transaction(async (tx) => {
      // Actualizar Edition con scoringRule y decimals
      await tx.edition.update({
        where: { id: editionId },
        data: {
          scoringRule,
          decimals,
          tieBreakOrder: JSON.stringify(tieBreakOrder),
        },
      });

      // Guardar cada EventConfig
      for (const item of configsToSave) {
        await tx.eventConfig.upsert({
          where: { editionId_key: { editionId, key: item.key } },
          create: {
            editionId,
            key: item.key,
            value: item.value as Prisma.InputJsonValue,
            description: item.desc,
          },
          update: {
            value: item.value as Prisma.InputJsonValue,
            description: item.desc,
          },
        });
      }

      // Registrar evento consolidado en AuditLog
      await tx.auditLog.create({
        data: {
          editionId,
          actorId: session.userId,
          type: "CONFIG_CHANGED",
          entityType: "EventConfig",
          metadata: {
            updatedBy: session.name,
            timestamp: new Date().toISOString(),
            moduleAWeights: normA,
            penaltyOrder,
            moduleBCriteriaWeights: normBCriteria,
            moduleBRunwayWeights: normBRunways,
            scoringRule,
            decimals,
            juryCount,
            tieBreakOrder,
          },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/resultados");
    revalidatePath("/vivo");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar la configuración";
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

// ─── Crear fraternidad (ADMIN) ──────────────────────────────

async function requireStoredImage(url: string | null | undefined) {
  if (!url) return;
  const image = await prisma.storedImage.findUnique({
    where: { id: url.slice("/api/images/".length) }, select: { id: true },
  });
  if (!image) throw new Error("La fotografía no existe. Vuelve a subirla antes de guardar.");
}

export async function createFraternityAction(
  input: unknown
): Promise<{ success: boolean; error?: string; fraternityId?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "groups:write");

    const parsed = fraternitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const data = parsed.data;

    const edition = await requireActiveEdition(data.editionId);
    await requireStoredImage(data.logoUrl);

    const name = data.name.trim();
    const existing = await prisma.fraternity.findFirst({
      where: { editionId: edition.id, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: `Ya existe la fraternidad "${name}" en esta edición.` };
    }

    const created = await prisma.$transaction(async (tx) => {
      const fraternity = await tx.fraternity.create({
        data: {
          editionId: edition.id,
          name,
          university: data.university.trim(),
          faculty: data.faculty?.trim() || null,
          city: data.city.trim(),
          department: data.department.trim(),
          logoUrl: data.logoUrl ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: edition.id,
          actorId: session.userId,
          type: "FRATERNITY_CREATED",
          entityType: "Fraternity",
          entityId: fraternity.id,
          metadata: { name, university: fraternity.university, city: fraternity.city },
        },
      });

      return fraternity;
    });

    revalidatePath("/admin");
    revalidatePath("/control");
    return { success: true, fraternityId: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Registrar grupo de danza (ADMIN) ───────────────────────

export async function createDanceGroupAction(
  input: unknown
): Promise<{ success: boolean; error?: string; danceGroupId?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "groups:write");

    const parsed = danceGroupSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const data = parsed.data;
    const danceName = data.danceName.trim();
    const edition = await requireActiveEdition(data.editionId);
    await requireStoredImage(data.photoUrl);

    const fraternity = await prisma.fraternity.findUnique({
      where: { id: data.fraternityId },
    });
    if (!fraternity || fraternity.editionId !== edition.id) {
      return { success: false, error: "La fraternidad no pertenece a la edición activa." };
    }

    // Regla: una fraternidad ≡ una danza por edición
    const duelDuplicate = await prisma.danceGroup.findFirst({
      where: { editionId: edition.id, fraternityId: fraternity.id },
      select: { id: true },
    });
    if (duelDuplicate) {
      return {
        success: false,
        error: `${fraternity.name} ya tiene una danza registrada en esta edición.`,
      };
    }

    if (data.entryOrder) {
      const orderTaken = await prisma.danceGroup.findFirst({
        where: { editionId: edition.id, entryOrder: data.entryOrder },
        select: { id: true },
      });
      if (orderTaken) {
        return { success: false, error: `El orden de ingreso #${data.entryOrder} ya está asignado.` };
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const group = await tx.danceGroup.create({
        data: {
          editionId: edition.id,
          fraternityId: fraternity.id,
          danceName,
          numberOfDancers: data.numberOfDancers,
          entryOrder: data.entryOrder ?? null,
          photoUrl: data.photoUrl ?? null,
          hasCaratula: data.hasCaratula ?? false,
          hasMonografia: data.hasMonografia ?? false,
          hasDancerList: data.hasDancerList ?? false,
          hasInvitation: data.hasInvitation ?? false,
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: edition.id,
          actorId: session.userId,
          type: "DANCE_GROUP_REGISTERED",
          entityType: "DanceGroup",
          entityId: group.id,
          metadata: {
            danceName,
            fraternityName: fraternity.name,
            entryOrder: data.entryOrder ?? null,
            numberOfDancers: data.numberOfDancers,
          },
        },
      });

      return group;
    });

    revalidatePath("/admin");
    revalidatePath("/jurado", "layout");
    revalidatePath("/control");
    return { success: true, danceGroupId: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Editar grupo de danza (ADMIN) ──────────────────────────

export async function updateDanceGroupAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "groups:write");

    const parsed = danceGroupSchema
      .extend({ danceGroupId: z.string().min(1) })
      .safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { danceGroupId, fraternityId, danceName, numberOfDancers, entryOrder, hasCaratula, hasMonografia, hasDancerList, hasInvitation, photoUrl } =
      parsed.data;
    await requireStoredImage(photoUrl);

    const existing = await prisma.danceGroup.findUnique({ where: { id: danceGroupId } });
    if (!existing) {
      return { success: false, error: "Grupo de danza no encontrado." };
    }
    await requireActiveEdition(parsed.data.editionId ?? existing.editionId);
    if (parsed.data.editionId && parsed.data.editionId !== existing.editionId) {
      return { success: false, error: "La danza no pertenece a la edición activa." };
    }

    const newFraternityId = fraternityId || existing.fraternityId;

    if (newFraternityId !== existing.fraternityId) {
      const fraternity = await prisma.fraternity.findUnique({ where: { id: newFraternityId } });
      if (!fraternity || fraternity.editionId !== existing.editionId) {
        return { success: false, error: "La fraternidad no pertenece a esta edición." };
      }
    }

    // Regla: una fraternidad ≡ una danza por edición (al cambiar fraternidad)
    if (newFraternityId !== existing.fraternityId) {
      const duelDuplicate = await prisma.danceGroup.findFirst({
        where: { editionId: existing.editionId, fraternityId: newFraternityId },
        select: { id: true },
      });
      if (duelDuplicate && duelDuplicate.id !== danceGroupId) {
        return { success: false, error: "Esa fraternidad ya tiene otra danza registrada en esta edición." };
      }
    }

    if (entryOrder && entryOrder !== existing.entryOrder) {
      const orderTaken = await prisma.danceGroup.findFirst({
        where: { editionId: existing.editionId, entryOrder },
        select: { id: true },
      });
      if (orderTaken && orderTaken.id !== danceGroupId) {
        return { success: false, error: `El orden de ingreso #${entryOrder} ya está asignado.` };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.danceGroup.update({
        where: { id: danceGroupId },
        data: {
          danceName: danceName.trim(),
          numberOfDancers,
          entryOrder: entryOrder ?? null,
          fraternityId: newFraternityId,
          ...(hasCaratula !== undefined && { hasCaratula }),
          ...(hasMonografia !== undefined && { hasMonografia }),
          ...(hasDancerList !== undefined && { hasDancerList }),
          ...(hasInvitation !== undefined && { hasInvitation }),
          // undefined = mantener la foto actual; null = quitar la foto
          ...(photoUrl !== undefined && { photoUrl }),
        },
      });

      await tx.auditLog.create({
        data: {
          editionId: existing.editionId,
          actorId: session.userId,
          type: "DANCE_GROUP_UPDATED",
          entityType: "DanceGroup",
          entityId: danceGroupId,
          metadata: {
            danceName: danceName.trim(),
            entryOrder: entryOrder ?? null,
            photoChanged: photoUrl !== undefined && photoUrl !== existing.photoUrl,
          },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/jurado", "layout");
    revalidatePath("/control");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}

// ─── Foto de candidata Moperita/Ñusta (ADMIN) ───────────────

export async function createParticipantAction(
  input: unknown
): Promise<{ success: boolean; error?: string; candidate?: RegisteredCandidate }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "participants:write");
    const parsed = participantSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    const data = parsed.data;
    await requireStoredImage(data.photoUrl);

    // SERIALIZABLE protege la asignación de turnos ante dos inscripciones simultáneas.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const candidate = await prisma.$transaction(async (tx) => {
          const edition = await requireActiveEdition(data.editionId, tx);
          const category = await tx.category.findUnique({
            where: { id: data.categoryId },
            include: { runways: { orderBy: { order: "asc" } } },
          });
          if (!category || category.editionId !== edition.id || category.moduleType !== "MOPERITA_NUSTA" || !["moperita", "nusta"].includes(category.slug)) {
            throw new Error("Selecciona una categoría Moperita o Ñusta de la edición activa.");
          }
          if (category.status === "CLOSED") throw new Error("La categoría está cerrada y no admite nuevas candidatas.");
          const runways = ["GALA", "CASUAL", "TIPICA"].map((type) => category.runways.find((r) => r.type === type));
          if (runways.some((r) => !r)) throw new Error("Configura las pasadas de Gala, Casual y Típica de esta categoría antes de registrar candidatas.");

          const fraternity = await tx.fraternity.findUnique({ where: { id: data.fraternityId } });
          if (!fraternity || fraternity.editionId !== edition.id) throw new Error("La fraternidad no pertenece a la edición activa.");
          const duplicate = await tx.participant.findUnique({
            where: { categoryId_fraternityId: { categoryId: category.id, fraternityId: fraternity.id } },
            select: { id: true },
          });
          if (duplicate) throw new Error(`Esta fraternidad ya tiene una candidata registrada en ${category.name}.`);

          const lastEntry = await tx.entry.aggregate({ where: { categoryId: category.id }, _max: { order: true } });
          const firstOrder = (lastEntry._max.order ?? 0) + 1;
          const participant = await tx.participant.create({
            data: {
              categoryId: category.id, fraternityId: fraternity.id, fullName: data.fullName,
              career: data.career || null, bio: data.bio || null, photoUrl: data.photoUrl ?? null,
              isAdult: data.isAdult ?? false, hasMatricula: data.hasMatricula ?? false, isActive: true,
              entries: {
                create: runways.map((runway, index) => ({
                  categoryId: category.id, runwayId: runway!.id, order: firstOrder + index, status: "PENDING",
                })),
              },
            },
          });
          await tx.auditLog.create({ data: {
            editionId: edition.id, actorId: session.userId, type: "PARTICIPANT_CREATED", entityType: "Participant", entityId: participant.id,
            metadata: { fullName: participant.fullName, categoryId: category.id, categoryName: category.name, fraternityId: fraternity.id,
              photoUrl: participant.photoUrl, runways: runways.map((r) => r!.type), firstOrder },
          } });
          return {
            id: participant.id, fullName: participant.fullName, categoryId: category.id, categoryName: category.name, categorySlug: category.slug,
            fraternityId: fraternity.id, fraternityName: fraternity.name, university: fraternity.university, photoUrl: participant.photoUrl, career: participant.career,
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        revalidatePath("/admin");
        revalidatePath("/jurado", "layout");
        revalidatePath("/notaria");
        revalidatePath("/resultados");
        revalidatePath("/vivo");
        return { success: true, candidate };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          if (attempt < 2) continue;
          return { success: false, error: "Otra inscripción se está guardando al mismo tiempo. Intenta nuevamente." };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return { success: false, error: "Esta fraternidad ya tiene una candidata registrada en la categoría seleccionada." };
        }
        throw error;
      }
    }
    return { success: false, error: "No se pudo completar la inscripción. Intenta nuevamente." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo registrar la candidata." };
  }
}

export async function setParticipantPhotoAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession(["ADMIN"]);
    requirePermission(session.role, "participants:write");

    const parsed = participantPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }

    const { participantId, photoUrl } = parsed.data;
    await requireStoredImage(photoUrl);

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true, fullName: true, category: { select: { editionId: true } } },
    });
    if (!participant) {
      return { success: false, error: "Candidata no encontrada." };
    }
    await requireActiveEdition(participant.category.editionId);

    await prisma.$transaction(async (tx) => {
      await tx.participant.update({ where: { id: participantId }, data: { photoUrl } });

      await tx.auditLog.create({
        data: {
          editionId: participant.category.editionId,
          actorId: session.userId,
          type: "PARTICIPANT_PHOTO_UPDATED",
          entityType: "Participant",
          entityId: participantId,
          metadata: { fullName: participant.fullName, photoUrl },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/jurado", "layout");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return { success: false, error: message };
  }
}
