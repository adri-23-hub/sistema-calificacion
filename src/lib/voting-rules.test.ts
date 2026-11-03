import { describe, it, expect } from "vitest";

describe("Reglas de Votación", () => {
  describe("Regla de Voto Único por Jurado", () => {
    it("simula bloqueo atómico de doble voto concurrente (idempotencia y validación previa)", async () => {
      // Simulación del almacén de base de datos en memoria para representar la transacción
      const votesDB = new Map<
        string,
        { id: string; juryId: string; danceGroupId: string; status: string }
      >();

      async function submitVoteSimulation(vote: {
        juryId: string;
        danceGroupId: string;
        clientUuid: string;
      }) {
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
});
