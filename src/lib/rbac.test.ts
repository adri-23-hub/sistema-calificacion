import { describe, it, expect } from "vitest";
import {
  hasPermission,
  requirePermission,
  canViewScoreValues,
  canViewVotingStatus,
  type Permission,
} from "./rbac";
import { Role } from "@prisma/client";

describe("Seguridad y Control de Acceso basado en Roles (RBAC)", () => {
  describe("Permisos de CONTROL (Personal de control en campo)", () => {
    it("CONTROL puede ver lista de grupos de danza", () => {
      expect(hasPermission(Role.CONTROL, "groups:read")).toBe(true);
    });

    it("CONTROL puede registrar banderolas y penalizaciones", () => {
      expect(hasPermission(Role.CONTROL, "penalties:register")).toBe(true);
    });

    it("CONTROL puede registrar hora de llegada", () => {
      expect(hasPermission(Role.CONTROL, "control:register_arrival")).toBe(true);
    });

    it("CONTROL NO puede ver notas ni resultados", () => {
      expect(hasPermission(Role.CONTROL, "scores:read")).toBe(false);
      expect(hasPermission(Role.CONTROL, "results:read")).toBe(false);
      expect(canViewScoreValues(Role.CONTROL, false)).toBe(false);
      expect(canViewScoreValues(Role.CONTROL, true)).toBe(false);
    });

    it("CONTROL NO puede descalificar grupos (exclusivo de ADMIN)", () => {
      expect(hasPermission(Role.CONTROL, "groups:disqualify")).toBe(false);
      expect(() => requirePermission(Role.CONTROL, "groups:disqualify")).toThrow();
    });

    it("CONTROL NO puede votar como jurado", () => {
      expect(hasPermission(Role.CONTROL, "scores:create")).toBe(false);
    });

    it("CONTROL NO puede anular penalizaciones (exclusivo de ADMIN)", () => {
      expect(hasPermission(Role.CONTROL, "penalties:void")).toBe(false);
    });
  });

  describe("Permisos de NOTARIO (Acceso de solo lectura para fiscalización)", () => {
    it("NOTARIO puede ver el registro de auditoría", () => {
      expect(hasPermission(Role.NOTARIO, "audit:read")).toBe(true);
    });

    it("NOTARIO puede ver QUIÉN ya votó (estado de votación)", () => {
      expect(canViewVotingStatus(Role.NOTARIO)).toBe(true);
    });

    it("NOTARIO NO puede ver las notas antes de la apertura oficial (modo sobre cerrado)", () => {
      // resultsRevealed = false
      expect(canViewScoreValues(Role.NOTARIO, false)).toBe(false);
    });

    it("NOTARIO puede ver las notas ÚNICAMENTE DESPUÉS de la apertura oficial", () => {
      // resultsRevealed = true
      expect(canViewScoreValues(Role.NOTARIO, true)).toBe(true);
    });

    it("NOTARIO tiene permiso de confirmar apertura oficial (confirm_notary)", () => {
      expect(hasPermission(Role.NOTARIO, "opening:confirm_notary")).toBe(true);
      expect(hasPermission(Role.NOTARIO, "opening:confirm_admin")).toBe(false);
    });

    it("NOTARIO NO puede votar ni modificar ningún dato", () => {
      expect(hasPermission(Role.NOTARIO, "scores:create")).toBe(false);
      expect(hasPermission(Role.NOTARIO, "scores:void")).toBe(false);
      expect(hasPermission(Role.NOTARIO, "penalties:register")).toBe(false);
      expect(hasPermission(Role.NOTARIO, "groups:disqualify")).toBe(false);
      expect(hasPermission(Role.NOTARIO, "config:write")).toBe(false);
    });
  });

  describe("Permisos de JURADO", () => {
    it("JURADO solo puede emitir votos y ver sus propias calificaciones", () => {
      expect(hasPermission(Role.JURADO, "scores:create")).toBe(true);
      expect(hasPermission(Role.JURADO, "scores:read")).toBe(true);
      expect(hasPermission(Role.JURADO, "results:read")).toBe(false);
      expect(canViewScoreValues(Role.JURADO, false)).toBe(false);
      expect(canViewScoreValues(Role.JURADO, true)).toBe(false);
    });

    it("JURADO no puede anular votos ni registrar penalizaciones", () => {
      expect(hasPermission(Role.JURADO, "scores:void")).toBe(false);
      expect(hasPermission(Role.JURADO, "penalties:register")).toBe(false);
    });
  });

  describe("Permisos de ADMIN (Comité Organizador)", () => {
    it("ADMIN tiene facultades exclusivas: descalificar, anular votos, anular penalizaciones, apertura", () => {
      expect(hasPermission(Role.ADMIN, "groups:disqualify")).toBe(true);
      expect(hasPermission(Role.ADMIN, "scores:void")).toBe(true);
      expect(hasPermission(Role.ADMIN, "penalties:void")).toBe(true);
      expect(hasPermission(Role.ADMIN, "config:write")).toBe(true);
      expect(hasPermission(Role.ADMIN, "opening:confirm_admin")).toBe(true);
    });

    it("Modo sobre cerrado: incluso ADMIN no ve notas antes de la apertura oficial si resultsRevealed es false", () => {
      expect(canViewScoreValues(Role.ADMIN, false)).toBe(false);
    });

    it("ADMIN ve las notas una vez revelados los resultados", () => {
      expect(canViewScoreValues(Role.ADMIN, true)).toBe(true);
    });
  });
});
