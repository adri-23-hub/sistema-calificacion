import { Role } from "@prisma/client";

/**
 * RBAC permission matrix — Sistema de Calificación
 * Roles: ADMIN, JURADO, NOTARIO, CONTROL
 */

export type Permission =
  | "participants:read"
  | "participants:write"
  | "juries:read"
  | "juries:write"
  | "rubrics:read"
  | "rubrics:write"
  | "scores:read"
  | "scores:create"
  | "scores:void"
  | "results:read"
  | "results:read_before_opening"  // ver notas antes de la apertura oficial
  | "audit:read"
  | "exports:read"
  | "categories:manage"
  | "edition:manage"
  | "penalties:register"           // registrar banderolas, incumplimiento, etc.
  | "penalties:void"               // anular penalizaciones
  | "groups:read"                  // ver lista de grupos de danza
  | "groups:write"                 // crear/editar grupos
  | "groups:disqualify"            // descalificar grupo (solo ADMIN)
  | "control:register_arrival"     // registrar hora de llegada
  | "opening:confirm_admin"        // confirmar apertura oficial (ADMIN)
  | "opening:confirm_notary"       // confirmar apertura oficial (NOTARIO)
  | "config:read"
  | "config:write";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "participants:read",
    "participants:write",
    "juries:read",
    "juries:write",
    "rubrics:read",
    "rubrics:write",
    "scores:read",
    "scores:void",
    "results:read",
    "results:read_before_opening",
    "audit:read",
    "exports:read",
    "categories:manage",
    "edition:manage",
    "penalties:register",
    "penalties:void",
    "groups:read",
    "groups:write",
    "groups:disqualify",
    "control:register_arrival",
    "opening:confirm_admin",
    "config:read",
    "config:write",
  ],
  JURADO: [
    "participants:read",
    "rubrics:read",
    "scores:create",
    "scores:read",      // solo sus propias notas
    "groups:read",
  ],
  NOTARIO: [
    "participants:read",
    "juries:read",
    "rubrics:read",
    "scores:read",      // ve quién votó, nunca las notas antes de la apertura
    "results:read",
    "audit:read",
    "exports:read",
    "groups:read",
    "opening:confirm_notary",
  ],
  CONTROL: [
    "groups:read",                // ve la lista de grupos
    "penalties:register",          // registra banderolas y orden
    "control:register_arrival",    // registra hora de llegada
    // NO puede ver notas, resultados, descalificar ni votar
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Rol ${role} no tiene permiso ${permission}`);
  }
}

/**
 * Verifica si un rol puede ver las notas numéricas.
 * Antes de la apertura oficial, NADIE ve las notas (ni ADMIN ni NOTARIO).
 * Solo se puede ver QUIÉN votó.
 */
export function canViewScoreValues(role: Role, resultsRevealed: boolean): boolean {
  if (!resultsRevealed) return false; // "sobre cerrado": nadie ve notas
  return hasPermission(role, "results:read");
}

/**
 * Verifica si un rol puede ver quién ya votó (sin ver las notas).
 * ADMIN, NOTARIO y el propio JURADO (sus propios votos) pueden ver esto.
 */
export function canViewVotingStatus(role: Role): boolean {
  return role === "ADMIN" || role === "NOTARIO" || role === "JURADO";
}
