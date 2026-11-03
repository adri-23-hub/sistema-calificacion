"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

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

