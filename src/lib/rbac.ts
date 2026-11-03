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
    "scores:read",      // ve quién votó, nunca las notas individuales
    "results:read",
    "audit:read",
    "exports:read",
    "groups:read",
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
 * Verifica si un rol puede ver quién ya votó (sin ver las notas individuales).
 * ADMIN, NOTARIO y el propio JURADO (sus propios votos) pueden ver esto.
 */
export function canViewVotingStatus(role: Role): boolean {
  return role === "ADMIN" || role === "NOTARIO" || role === "JURADO";
}
