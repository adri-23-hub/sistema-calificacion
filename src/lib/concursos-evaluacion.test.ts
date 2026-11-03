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
  validateWeightsSum,
  type PenaltySummary,
  type DanceJuryScore,
  type RunwayWeight,
  type TieBreakEntry,
} from "./scoring";

describe("Reglas de Evaluación Oficiales — XIII Entrada Folklórica Universitaria Nacional 2026", () => {
  describe("1. Independencia de Concursos", () => {
    it("los dos concursos tienen cálculos y estructuras de resultado independientes", () => {
      // Concurso B: Danza
      const danceJury: DanceJuryScore[] = [{ coreografia: 90, vestimenta: 80, entusiasmo: 85 }];
      const danceResult = calculateDanceGroupFinalScore(danceJury, {
        yellowFlags: 0,
        redFlags: 0,
        orderViolation: false,
        manualDeductions: 0,
      });

      // Concurso A: Candidata
      const runwayScores = {
        GALA: [90],
        CASUAL: [85],
        TIPICA: [95],
      };
      const runwayWeights: RunwayWeight[] = [
        { type: "GALA", weight: 0.34 },
        { type: "CASUAL", weight: 0.33 },
        { type: "TIPICA", weight: 0.33 },
      ];
      const candidateResult = calculateCandidateFinalScore(runwayScores, runwayWeights);

      // Verificamos que ambos cálculos son independientes y válidos
      expect(danceResult.finalScore).toBe(85.5); // 90*0.4 + 80*0.3 + 85*0.3 = 36 + 24 + 25.5 = 85.5
      expect(candidateResult.totalScore).toBeCloseTo(90.0, 1);
    });
  });

  describe("2. Concurso A — Moperita y Ñusta de Bolivia 2026", () => {
    it("evalúa las 3 pasadas obligatorias (Gala, Casual, Típica) con ponderación configurable", () => {
      // Ponderación reglamentaria configurable: Gala 40%, Casual 30%, Típica 30% (suma 100%)
      const weights: RunwayWeight[] = [
        { type: "GALA", weight: 0.40 },
        { type: "CASUAL", weight: 0.30 },
        { type: "TIPICA", weight: 0.30 },
      ];

      expect(validateWeightsSum(weights.map((w) => w.weight))).toBe(true);

      const jurorScores = {
        GALA: [90, 80],   // Promedio: 85 * 0.40 = 34
        CASUAL: [70, 90], // Promedio: 80 * 0.30 = 24
        TIPICA: [95, 85], // Promedio: 90 * 0.30 = 27
      };

      const result = calculateCandidateFinalScore(jurorScores, weights, { decimals: 2 });
      // 34 + 24 + 27 = 85.00
      expect(result.totalScore).toBe(85);
    });

    it("evalúa los 4 criterios de una pasada normalizados a escala 0–100", () => {
      // 4 criterios: Porte, Carisma, Autenticidad, Originalidad (25% cada uno)
      const criteria = [
        { criterionId: "c1", points: 9.0, weight: 0.25, maxPoints: 10.0 }, // Porte y elegancia
        { criterionId: "c2", points: 8.0, weight: 0.25, maxPoints: 10.0 }, // Carisma y simpatía
        { criterionId: "c3", points: 10.0, weight: 0.25, maxPoints: 10.0 }, // Autenticidad traje típico
        { criterionId: "c4", points: 9.0, weight: 0.25, maxPoints: 10.0 }, // Originalidad casual
      ];

      // Promedio ponderado normalizado: (0.90*0.25 + 0.80*0.25 + 1.00*0.25 + 0.90*0.25) / 1.0 * 100 = 90.00
      const score = calculateRunwayJuryScore(criteria, 2);
      expect(score).toBe(90.0);
    });
  });

  describe("3. Concurso B — Entrada Folklórica (Danzas)", () => {
    it("aplica los pesos oficiales del reglamento: Coreografía 40%, Vestimenta 30%, Entusiasmo 30%", () => {
      const score: DanceJuryScore = {
        coreografia: 100, // 100 * 0.40 = 40
        vestimenta: 90,   // 90 * 0.30 = 27
        entusiasmo: 80,   // 80 * 0.30 = 24
      };
      // 40 + 27 + 24 = 91.0
      expect(calculateDanceJuryScore(score)).toBe(91.0);
    });

    it("calcula penalizaciones según reglamento oficial:", () => {
      // a) Cada 3 amarillas: -5 pts
      expect(calculatePenaltyTotal({ yellowFlags: 2, redFlags: 0, orderViolation: false, manualDeductions: 0 })).toBe(0);
      expect(calculatePenaltyTotal({ yellowFlags: 3, redFlags: 0, orderViolation: false, manualDeductions: 0 })).toBe(5);
      expect(calculatePenaltyTotal({ yellowFlags: 5, redFlags: 0, orderViolation: false, manualDeductions: 0 })).toBe(5);
      expect(calculatePenaltyTotal({ yellowFlags: 6, redFlags: 0, orderViolation: false, manualDeductions: 0 })).toBe(10);

      // b) Cada roja: -10 pts
      expect(calculatePenaltyTotal({ yellowFlags: 0, redFlags: 1, orderViolation: false, manualDeductions: 0 })).toBe(10);
      expect(calculatePenaltyTotal({ yellowFlags: 0, redFlags: 3, orderViolation: false, manualDeductions: 0 })).toBe(30);

      // c) No respetar orden de ingreso asignado: -5 pts
      expect(calculatePenaltyTotal({ yellowFlags: 0, redFlags: 0, orderViolation: true, manualDeductions: 0 })).toBe(5);

      // d) Faltas graves y descuentos manuales acumulados
      const complex: PenaltySummary = {
        yellowFlags: 6,       // 10 pts
        redFlags: 2,          // 20 pts
        orderViolation: true, // 5 pts
        manualDeductions: 15, // 15 pts (ej. alcohol/indisciplina)
      };
      expect(calculatePenaltyTotal(complex)).toBe(50);
      const breakdown = calculatePenaltyBreakdown(complex);
      expect(breakdown).toEqual({
        fromYellow: 10,
        fromRed: 20,
        fromOrder: 5,
        fromManual: 15,
      });
    });

    it("la nota final nunca es negativa (piso en 0)", () => {
      const juryScores: DanceJuryScore[] = [{ coreografia: 20, vestimenta: 20, entusiasmo: 20 }];
      const penalties: PenaltySummary = {
        yellowFlags: 0,
        redFlags: 5, // -50 pts
        orderViolation: false,
        manualDeductions: 0,
      };
      const result = calculateDanceGroupFinalScore(juryScores, penalties);
      expect(result.average).toBe(20);
      expect(result.finalScore).toBe(0);
    });

    it("soporta orden configurable de penalizaciones (BEFORE_AVERAGE vs AFTER_AVERAGE)", () => {
      const juryScores: DanceJuryScore[] = [
        { coreografia: 100, vestimenta: 100, entusiasmo: 100 }, // 100
        { coreografia: 80, vestimenta: 80, entusiasmo: 80 },   // 80
        { coreografia: 10, vestimenta: 10, entusiasmo: 10 },   // 10
      ];
      // Penalización: 1 roja = 10 pts
      const penalties: PenaltySummary = {
        yellowFlags: 0,
        redFlags: 1,
        orderViolation: false,
        manualDeductions: 0,
      };

      // AFTER_AVERAGE: Promedio = (100+80+10)/3 = 63.33. Final = 63.33 - 10 = 53.33
      const resAfter = calculateDanceGroupFinalScore(juryScores, penalties, { penaltyOrder: "AFTER_AVERAGE" });
      expect(resAfter.average).toBe(63.33);
      expect(resAfter.finalScore).toBe(53.33);

      // BEFORE_AVERAGE:
      // Jurado 1: 100 - 10 = 90
      // Jurado 2: 80 - 10 = 70
      // Jurado 3: 10 - 10 = 0
      // Promedio penalizado = (90 + 70 + 0) / 3 = 53.33
      const resBefore = calculateDanceGroupFinalScore(juryScores, penalties, { penaltyOrder: "BEFORE_AVERAGE" });
      expect(resBefore.finalScore).toBe(53.33);

      // Si un jurado baja a menos de 0:
      const harshPenalties: PenaltySummary = {
        yellowFlags: 0,
        redFlags: 3, // 30 pts de penalización
        orderViolation: false,
        manualDeductions: 0,
      };
      // BEFORE_AVERAGE:
      // Jurado 1: 100 - 30 = 70
      // Jurado 2: 80 - 30 = 50
      // Jurado 3: max(10 - 30, 0) = 0 (acotado en 0!)
      // Promedio = (70 + 50 + 0)/3 = 40.00
      const harshBefore = calculateDanceGroupFinalScore(juryScores, harshPenalties, { penaltyOrder: "BEFORE_AVERAGE" });
      expect(harshBefore.finalScore).toBe(40.0);

      // AFTER_AVERAGE:
      // Promedio = 63.33 - 30 = 33.33
      const harshAfter = calculateDanceGroupFinalScore(juryScores, harshPenalties, { penaltyOrder: "AFTER_AVERAGE" });
      expect(harshAfter.finalScore).toBe(33.33);
    });
  });

  describe("4. Reglas de Desempate Configurables", () => {
    it("resuelve desempates por orden de criterios configurado por el comité", () => {
      const candidates: TieBreakEntry[] = [
        {
          id: "frat-A",
          finalScore: 90,
          criteriaScores: { coreografia: 92, vestimenta: 88, entusiasmo: 90 },
          penaltyTotal: 0,
        },
        {
          id: "frat-B",
          finalScore: 90,
          criteriaScores: { coreografia: 90, vestimenta: 90, entusiasmo: 90 },
          penaltyTotal: 0,
        },
        {
          id: "frat-C",
          finalScore: 90,
          criteriaScores: { coreografia: 90, vestimenta: 90, entusiasmo: 88 },
          penaltyTotal: 5, // empata en coreo (90) y vestimenta (90), pero tiene 5 de penalización
        },
      ];

      // Prioridad: coreografía > vestimenta > menor penalización
      const sorted = resolveTieBreak(candidates, ["coreografia", "vestimenta"]);
      expect(sorted[0].id).toBe("frat-A"); // Mayor coreografía (92)
      expect(sorted[1].id).toBe("frat-B"); // Mismo 90 en coreo y vestimenta, pero 0 penalizaciones vs C con 5
      expect(sorted[2].id).toBe("frat-C");
    });
  });

  describe("5. Validación de Suma de Pesos al 100%", () => {
    it("valida que los pesos sumen 100% con tolerancia del 1%", () => {
      expect(validateWeightsSum([0.40, 0.30, 0.30])).toBe(true);
      expect(validateWeightsSum([1/3, 1/3, 1/3])).toBe(true);
      expect(validateWeightsSum([0.25, 0.25, 0.25, 0.25])).toBe(true);

      expect(validateWeightsSum([0.40, 0.40, 0.30])).toBe(false); // 1.10
      expect(validateWeightsSum([0.30, 0.30, 0.30])).toBe(false); // 0.90
    });
  });

  describe("6. Agregación de Notas de Jurados (MEAN vs TRIMMED_MEAN)", () => {
    it("calcula promedio simple correctamente", () => {
      expect(calculateMean([80, 90, 100])).toBe(90);
    });

    it("calcula promedio recortado descartando nota máxima y mínima", () => {
      // [50, 80, 90, 100] -> descarta 50 y 100 -> (80 + 90) / 2 = 85
      expect(calculateTrimmedMean([50, 80, 90, 100])).toBe(85);
    });

    it("devuelve promedio simple si hay menos de 3 jurados en TRIMMED_MEAN", () => {
      expect(calculateTrimmedMean([80, 90])).toBe(85);
    });
  });
});
