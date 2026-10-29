import { describe, it, expect } from "vitest";
import {
  calculateDanceJuryScore,
  calculatePenaltyTotal,
  calculatePenaltyBreakdown,
  calculateMean,
  calculateTrimmedMean,
  calculateDanceGroupFinalScore,
  calculateRunwayJuryScore,
  calculateCandidateFinalScore,
  resolveTieBreak,
  type PenaltySummary,
  type DanceJuryScore,
  type TieBreakEntry,
} from "./scoring";

describe("Módulo A: Fórmula de cálculo de grupo de danza", () => {
  describe("Puntaje individual de un jurado", () => {
    it("calcula correctamente la nota con los pesos por defecto (40% Coreo, 30% Vestimenta, 30% Entusiasmo)", () => {
      // 80 * 0.40 + 90 * 0.30 + 70 * 0.30 = 32 + 27 + 21 = 80
      const score: DanceJuryScore = { coreografia: 80, vestimenta: 90, entusiasmo: 70 };
      expect(calculateDanceJuryScore(score)).toBe(80);
    });

    it("redondea a 2 decimales por defecto", () => {
      // 85 * 0.40 + 92 * 0.30 + 77 * 0.30 = 34 + 27.6 + 23.1 = 84.7
      const score: DanceJuryScore = { coreografia: 85, vestimenta: 92, entusiasmo: 77 };
      expect(calculateDanceJuryScore(score)).toBe(84.7);
    });
  });

  describe("Cálculo de penalizaciones", () => {
    const basePenalty: PenaltySummary = {
      yellowFlags: 0,
      redFlags: 0,
      orderViolation: false,
      manualDeductions: 0,
    };

    it("caso 0 amarillas: 0 puntos de penalización", () => {
      const p = { ...basePenalty, yellowFlags: 0 };
      expect(calculatePenaltyTotal(p)).toBe(0);
    });

    it("caso 1 amarilla: 0 puntos de penalización (aún no llega al umbral de 3)", () => {
      const p = { ...basePenalty, yellowFlags: 1 };
      expect(calculatePenaltyTotal(p)).toBe(0);
    });

    it("caso 2 amarillas: 0 puntos de penalización (aún no llega al umbral de 3)", () => {
      const p = { ...basePenalty, yellowFlags: 2 };
      expect(calculatePenaltyTotal(p)).toBe(0);
    });

    it("caso 3 amarillas: 5 puntos de penalización (floor(3/3)*5 = 5)", () => {
      const p = { ...basePenalty, yellowFlags: 3 };
      expect(calculatePenaltyTotal(p)).toBe(5);
    });

    it("caso 5 amarillas: 5 puntos de penalización (floor(5/3)*5 = 5)", () => {
      const p = { ...basePenalty, yellowFlags: 5 };
      expect(calculatePenaltyTotal(p)).toBe(5);
    });

    it("caso 6 amarillas: 10 puntos de penalización (floor(6/3)*5 = 10)", () => {
      const p = { ...basePenalty, yellowFlags: 6 };
      expect(calculatePenaltyTotal(p)).toBe(10);
    });

    it("caso banderola roja: 10 puntos por cada roja", () => {
      const p1 = { ...basePenalty, redFlags: 1 };
      expect(calculatePenaltyTotal(p1)).toBe(10);

      const p2 = { ...basePenalty, redFlags: 2 };
      expect(calculatePenaltyTotal(p2)).toBe(20);
    });

    it("caso orden incumplido: 5 puntos de penalización", () => {
      const p = { ...basePenalty, orderViolation: true };
      expect(calculatePenaltyTotal(p)).toBe(5);
    });

    it("combinación de penalizaciones: 3 amarillas + 1 roja + orden incumplido + descuento manual", () => {
      // 5 (de 3 amarillas) + 10 (de 1 roja) + 5 (de orden) + 15 (manual por bailarines ebrios) = 35
      const p: PenaltySummary = {
        yellowFlags: 3,
        redFlags: 1,
        orderViolation: true,
        manualDeductions: 15,
      };
      expect(calculatePenaltyTotal(p)).toBe(35);

      const breakdown = calculatePenaltyBreakdown(p);
      expect(breakdown).toEqual({
        fromYellow: 5,
        fromRed: 10,
        fromOrder: 5,
        fromManual: 15,
      });
    });
  });

  describe("Nota final del grupo de danza", () => {
    it("la nota final nunca baja de 0 (regla max(promedio - penalizaciones, 0))", () => {
      const juryScores: DanceJuryScore[] = [
        { coreografia: 20, vestimenta: 20, entusiasmo: 20 }, // 20
        { coreografia: 30, vestimenta: 20, entusiasmo: 20 }, // 24
      ];
      // Promedio = 22
      // Penalización = 50 (5 rojas)
      const penalties: PenaltySummary = {
        yellowFlags: 0,
        redFlags: 5,
        orderViolation: false,
        manualDeductions: 0,
      };

      const result = calculateDanceGroupFinalScore(juryScores, penalties);
      expect(result.average).toBe(22);
      expect(result.penaltyTotal).toBe(50);
      expect(result.finalScore).toBe(0); // No baja a -28, queda en 0
    });

    it("calcula promedio recortado correctamente (descarta nota máxima y mínima)", () => {
      // Notas jurados: 95, 80, 85, 75, 40
      // Ordenadas: [40, 75, 80, 85, 95]
      // Recortadas (descarta 40 y 95): [75, 80, 85]
      // Promedio recortado: (75 + 80 + 85) / 3 = 80
      const juryScores: DanceJuryScore[] = [
        { coreografia: 95, vestimenta: 95, entusiasmo: 95 }, // 95
        { coreografia: 80, vestimenta: 80, entusiasmo: 80 }, // 80
        { coreografia: 85, vestimenta: 85, entusiasmo: 85 }, // 85
        { coreografia: 75, vestimenta: 75, entusiasmo: 75 }, // 75
        { coreografia: 40, vestimenta: 40, entusiasmo: 40 }, // 40
      ];

      const penalties: PenaltySummary = {
        yellowFlags: 0,
        redFlags: 0,
        orderViolation: false,
        manualDeductions: 0,
      };

      const trimmedResult = calculateDanceGroupFinalScore(juryScores, penalties, {
        scoringRule: "TRIMMED_MEAN",
      });
      expect(trimmedResult.average).toBe(80);
      expect(trimmedResult.finalScore).toBe(80);

      // En cambio con promedio simple: (95+80+85+75+40)/5 = 375/5 = 75
      const meanResult = calculateDanceGroupFinalScore(juryScores, penalties, {
        scoringRule: "MEAN",
      });
      expect(meanResult.average).toBe(75);
    });
  });

  describe("Criterio de desempate", () => {
    it("desempata por nota en criterio de mayor peso, luego por menor penalización", () => {
      const entries: TieBreakEntry[] = [
        {
          id: "grupo-B",
          finalScore: 85,
          criteriaScores: { coreografia: 88, vestimenta: 82, entusiasmo: 85 },
          penaltyTotal: 5,
        },
        {
          id: "grupo-A",
          finalScore: 85,
          criteriaScores: { coreografia: 90, vestimenta: 80, entusiasmo: 85 },
          penaltyTotal: 5,
        },
        {
          id: "grupo-C",
          finalScore: 85,
          criteriaScores: { coreografia: 88, vestimenta: 82, entusiasmo: 85 },
          penaltyTotal: 0, // menor penalización que grupo-B
        },
      ];

      // Orden de desempate: mayor nota en coreografía, luego menor penalización
      const resolved = resolveTieBreak(entries, ["coreografia"]);

      // 1. Grupo A tiene mayor coreografía (90) -> 1er lugar
      expect(resolved[0].id).toBe("grupo-A");
      // 2. Entre B y C empatan en coreografía (88), pero C tiene 0 penalizaciones vs 5 de B -> C es 2do
      expect(resolved[1].id).toBe("grupo-C");
      // 3. Grupo B es 3ero
      expect(resolved[2].id).toBe("grupo-B");
    });
  });
});

describe("Módulo B: Fórmula de cálculo para Candidatas (Moperita y Ñusta)", () => {
  it("calcula la nota ponderada por pasarela y nota final de candidata", () => {
    // 3 pasarelas con pesos iguales (1/3 cada una)
    const runwayWeights = [
      { type: "GALA" as const, weight: 1 / 3 },
      { type: "CASUAL" as const, weight: 1 / 3 },
      { type: "TIPICA" as const, weight: 1 / 3 },
    ];

    // Jurados para cada pasarela
    const runwayJuryScores = {
      GALA: [90, 85, 95],    // Promedio: 90
      CASUAL: [80, 85, 75],  // Promedio: 80
      TIPICA: [95, 100, 90], // Promedio: 95
    };

    const result = calculateCandidateFinalScore(runwayJuryScores, runwayWeights);

    // Gala: 90 * (1/3) = 30
    // Casual: 80 * (1/3) = 26.67
    // Típica: 95 * (1/3) = 31.67
    // Total = 30 + 26.67 + 31.67 = 88.34
    expect(result.runwayScores.find((r) => r.runwayType === "GALA")?.runwayAverage).toBe(90);
    expect(result.runwayScores.find((r) => r.runwayType === "CASUAL")?.runwayAverage).toBe(80);
    expect(result.runwayScores.find((r) => r.runwayType === "TIPICA")?.runwayAverage).toBe(95);
    expect(result.totalScore).toBeCloseTo(88.33, 1);
  });
});
