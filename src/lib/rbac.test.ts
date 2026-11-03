import { describe, it, expect } from "vitest";
import { hasPermission, requirePermission, canViewVotingStatus } from "./rbac";
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

    it("NOTARIO puede consultar los resultados públicos agregados", () => {
      expect(hasPermission(Role.NOTARIO, "results:read")).toBe(true);
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
    });

    it("JURADO no puede anular votos ni registrar penalizaciones", () => {
      expect(hasPermission(Role.JURADO, "scores:void")).toBe(false);
      expect(hasPermission(Role.JURADO, "penalties:register")).toBe(false);
    });
  });

  describe("Permisos de ADMIN (Comité Organizador)", () => {
    it("ADMIN tiene facultades exclusivas: descalificar, anular votos, anular penalizaciones y configurar", () => {
      expect(hasPermission(Role.ADMIN, "groups:disqualify")).toBe(true);
      expect(hasPermission(Role.ADMIN, "scores:void")).toBe(true);
      expect(hasPermission(Role.ADMIN, "penalties:void")).toBe(true);
      expect(hasPermission(Role.ADMIN, "config:write")).toBe(true);
    });

    it("ADMIN puede consultar los resultados públicos agregados", () => {
      expect(hasPermission(Role.ADMIN, "results:read")).toBe(true);
    });
  });
});
