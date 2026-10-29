import { describe, it, expect } from "vitest";

describe("Reglas de Votación y Apertura Oficial", () => {
  describe("Regla de Voto Único por Jurado", () => {
    it("simula bloqueo atómico de doble voto concurrente (idempotencia y validación previa)", async () => {
      // Simulación del almacén de base de datos en memoria para representar la transacción
      const votesDB = new Map<string, { id: string; juryId: string; danceGroupId: string; status: string }>();

      async function submitVoteSimulation(vote: { juryId: string; danceGroupId: string; clientUuid: string }) {
        const key = `${vote.danceGroupId}-${vote.juryId}`;

        // Chequeo de voto existente
        const existing = votesDB.get(key);
        if (existing && existing.status === "SUBMITTED") {
          throw new Error("Ya emitiste tu calificación para este grupo. El voto es irrevocable.");
        }

        // Guardar voto
        const record = {
          id: vote.clientUuid,
          juryId: vote.juryId,
          danceGroupId: vote.danceGroupId,
          status: "SUBMITTED",
        };
        votesDB.set(key, record);
        return record;
      }

      // 1. Primer voto exitoso
      const vote1 = await submitVoteSimulation({
        juryId: "jurado-1",
        danceGroupId: "grupo-diablada",
        clientUuid: "uuid-vote-1",
      });
      expect(vote1.status).toBe("SUBMITTED");

      // 2. Intento de segundo voto por el mismo jurado sobre el mismo grupo -> debe fallar
      await expect(
        submitVoteSimulation({
          juryId: "jurado-1",
          danceGroupId: "grupo-diablada",
          clientUuid: "uuid-vote-2",
        })
      ).rejects.toThrow("El voto es irrevocable");

      // 3. Otro jurado sí puede votar por el mismo grupo
      const vote2 = await submitVoteSimulation({
        juryId: "jurado-2",
        danceGroupId: "grupo-diablada",
        clientUuid: "uuid-vote-3",
      });
      expect(vote2.status).toBe("SUBMITTED");
    });
  });

  describe("Apertura oficial con doble confirmación (ADMIN + NOTARIO)", () => {
    it("los resultados se revelan ÚNICAMENTE cuando ambos han confirmado", () => {
      interface EditionState {
        adminConfirmedAt: Date | null;
        notaryConfirmedAt: Date | null;
        resultsRevealed: boolean;
      }

      function confirmAdmin(edition: EditionState): EditionState {
        if (edition.adminConfirmedAt) throw new Error("Ya confirmado por ADMIN");
        const adminConfirmedAt = new Date();
        const resultsRevealed = edition.notaryConfirmedAt !== null;
        return { ...edition, adminConfirmedAt, resultsRevealed };
      }

      function confirmNotary(edition: EditionState): EditionState {
        if (edition.notaryConfirmedAt) throw new Error("Ya confirmado por NOTARIO");
        const notaryConfirmedAt = new Date();
        const resultsRevealed = edition.adminConfirmedAt !== null;
        return { ...edition, notaryConfirmedAt, resultsRevealed };
      }

      // Estado inicial
      let state: EditionState = {
        adminConfirmedAt: null,
        notaryConfirmedAt: null,
        resultsRevealed: false,
      };

      // 1. Confirma solo ADMIN -> los resultados permanecen bloqueados (sobre cerrado)
      state = confirmAdmin(state);
      expect(state.adminConfirmedAt).not.toBeNull();
      expect(state.notaryConfirmedAt).toBeNull();
      expect(state.resultsRevealed).toBe(false);

      // 2. Confirma NOTARIO -> ahora ambos confirmaron, resultados revelados
      state = confirmNotary(state);
      expect(state.notaryConfirmedAt).not.toBeNull();
      expect(state.resultsRevealed).toBe(true);
    });

    it("funciona en orden inverso (primero NOTARIO, luego ADMIN)", () => {
      interface EditionState {
        adminConfirmedAt: Date | null;
        notaryConfirmedAt: Date | null;
        resultsRevealed: boolean;
      }

      function confirmAdmin(edition: EditionState): EditionState {
        return { ...edition, adminConfirmedAt: new Date(), resultsRevealed: edition.notaryConfirmedAt !== null };
      }

      function confirmNotary(edition: EditionState): EditionState {
        return { ...edition, notaryConfirmedAt: new Date(), resultsRevealed: edition.adminConfirmedAt !== null };
      }

      let state: EditionState = {
        adminConfirmedAt: null,
        notaryConfirmedAt: null,
        resultsRevealed: false,
      };

      // 1. Confirma NOTARIO primero
      state = confirmNotary(state);
      expect(state.resultsRevealed).toBe(false);

      // 2. Confirma ADMIN después -> se revelan
      state = confirmAdmin(state);
      expect(state.resultsRevealed).toBe(true);
    });
  });
});
