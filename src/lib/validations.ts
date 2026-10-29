/**
 * Esquemas de validación con Zod 4 — Sistema de Calificación
 * Valida toda entrada del servidor: rangos de nota, pertenencia del voto,
 * estados de entidad, configuración, penalizaciones, etc.
 */

import { z } from "zod";

// ─── Módulo A: Calificación de Danza ────────────────────────

export const danceScoreSchema = z.object({
  danceGroupId: z.string().min(1, "ID del grupo requerido"),
  coreografia: z
    .number()
    .min(1, "Mínimo 1")
    .max(100, "Máximo 100"),
  vestimenta: z
    .number()
    .min(1, "Mínimo 1")
    .max(100, "Máximo 100"),
  entusiasmo: z
    .number()
    .min(1, "Mínimo 1")
    .max(100, "Máximo 100"),
  observations: z.string().max(500).optional(),
  clientUuid: z.string().uuid().optional(),
});

export type DanceScoreInput = z.infer<typeof danceScoreSchema>;

// ─── Módulo B: Calificación de Candidata (pasarela) ─────────

export const candidateScoreSchema = z.object({
  entryId: z.string().min(1, "ID de entry requerido"),
  rubricId: z.string().min(1, "ID de rúbrica requerido"),
  items: z
    .array(
      z.object({
        criterionId: z.string().min(1),
        points: z.number().min(0).max(10, "Máximo 10 puntos por criterio"),
      })
    )
    .min(1, "Se requiere al menos un criterio"),
  observations: z.string().max(500).optional(),
  clientUuid: z.string().uuid().optional(),
});

export type CandidateScoreInput = z.infer<typeof candidateScoreSchema>;

// ─── Penalizaciones (Módulo A) ──────────────────────────────

export const penaltySchema = z.object({
  danceGroupId: z.string().min(1, "ID del grupo requerido"),
  type: z.enum(["YELLOW_FLAG", "RED_FLAG", "ORDER_VIOLATION", "MANUAL_DEDUCTION", "DISQUALIFICATION"]),
  points: z.number().min(0).optional(), // solo para MANUAL_DEDUCTION
  observation: z.string().min(1, "Se requiere una observación").max(500),
});

export type PenaltyInput = z.infer<typeof penaltySchema>;

// ─── Anulación de voto (ADMIN) ──────────────────────────────

export const voidScoreSchema = z.object({
  scoreId: z.string().min(1, "ID del voto requerido"),
  scoreType: z.enum(["dance", "candidate"]),
  reason: z.string().min(5, "El motivo debe tener al menos 5 caracteres").max(500),
});

export type VoidScoreInput = z.infer<typeof voidScoreSchema>;

// ─── Anulación de penalización (ADMIN) ──────────────────────

export const voidPenaltySchema = z.object({
  penaltyId: z.string().min(1, "ID de la penalización requerido"),
  reason: z.string().min(5, "El motivo debe tener al menos 5 caracteres").max(500),
});

export type VoidPenaltyInput = z.infer<typeof voidPenaltySchema>;

// ─── Descalificación (solo ADMIN) ───────────────────────────

export const disqualifySchema = z.object({
  danceGroupId: z.string().min(1, "ID del grupo requerido"),
  reason: z.string().min(5, "El motivo debe tener al menos 5 caracteres").max(500),
});

export type DisqualifyInput = z.infer<typeof disqualifySchema>;

// ─── Login Jurado / CONTROL (código + PIN) ──────────────────

export const loginCodePinSchema = z.object({
  code: z
    .string()
    .min(1, "Código requerido")
    .max(20)
    .transform((v) => v.toUpperCase().trim()),
  pin: z
    .string()
    .min(4, "PIN debe tener al menos 4 dígitos")
    .max(8)
    .regex(/^\d+$/, "El PIN solo puede contener dígitos"),
});

export type LoginCodePinInput = z.infer<typeof loginCodePinSchema>;

// ─── Login Admin / Notario (email + password) ───────────────

export const loginEmailPasswordSchema = z.object({
  email: z.string().email("Email inválido").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

export type LoginEmailPasswordInput = z.infer<typeof loginEmailPasswordSchema>;

// ─── Configuración del evento ───────────────────────────────

export const eventConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(), // se valida por key específico
  description: z.string().optional(),
});

// ─── Pesos de criterios (deben sumar ~100%) ─────────────────

export const criteriaWeightsSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      weight: z.number().min(0).max(1),
    })
  )
  .refine(
    (items) => {
      const sum = items.reduce((s, i) => s + i.weight, 0);
      return Math.abs(sum - 1.0) <= 0.01;
    },
    { message: "Los pesos de los criterios deben sumar 100% (tolerancia 1%)" }
  );

// ─── Pesos de pasarelas (deben sumar ~100%) ─────────────────

export const runwayWeightsSchema = z
  .array(
    z.object({
      type: z.enum(["GALA", "CASUAL", "TIPICA"]),
      weight: z.number().min(0).max(1),
    })
  )
  .refine(
    (items) => {
      const sum = items.reduce((s, i) => s + i.weight, 0);
      return Math.abs(sum - 1.0) <= 0.01;
    },
    { message: "Los pesos de las pasarelas deben sumar 100% (tolerancia 1%)" }
  );

// ─── Grupo de danza ─────────────────────────────────────────

export const danceGroupSchema = z.object({
  fraternityId: z.string().min(1),
  danceName: z.string().min(1, "Nombre de la danza requerido").max(200),
  numberOfDancers: z.number().int().min(1, "Debe haber al menos 1 bailarín"),
  entryOrder: z.number().int().min(1).optional(),
  hasCaratula: z.boolean().optional(),
  hasMonografia: z.boolean().optional(),
  hasDancerList: z.boolean().optional(),
  hasInvitation: z.boolean().optional(),
});

export type DanceGroupInput = z.infer<typeof danceGroupSchema>;

// ─── Candidata ──────────────────────────────────────────────

export const participantSchema = z.object({
  categoryId: z.string().min(1),
  fraternityId: z.string().min(1),
  fullName: z.string().min(1, "Nombre completo requerido").max(200),
  career: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
  isAdult: z.boolean().optional(),
  hasMatricula: z.boolean().optional(),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

// ─── Apertura oficial ───────────────────────────────────────

export const officialOpeningConfirmSchema = z.object({
  editionId: z.string().min(1),
  confirmationType: z.enum(["admin", "notary"]),
});

export type OfficialOpeningInput = z.infer<typeof officialOpeningConfirmSchema>;

// ─── Registro de llegada (CONTROL) ──────────────────────────

export const arrivalRegistrationSchema = z.object({
  danceGroupId: z.string().min(1),
  arrivalTime: z.string().datetime().optional(), // ISO string; si no se envía, usa now()
});

export type ArrivalRegistrationInput = z.infer<typeof arrivalRegistrationSchema>;

// ─── Cambio de estado de grupo/entry ────────────────────────

export const statusChangeSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(["danceGroup", "entry"]),
  newStatus: z.enum(["PENDING", "IN_SCORING", "CLOSED"]),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
