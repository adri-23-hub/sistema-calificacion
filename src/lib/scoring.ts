/**
 * Funciones puras de cálculo — Sistema de Calificación
 * Sin acceso a la base de datos, para facilitar las pruebas unitarias.
 *
 * Módulo A: Entrada Folklórica (grupos de danza)
 * Módulo B: Moperita y Ñusta de Bolivia 2026
 */

// ─── Módulo A: Entrada Folklórica ───────────────────────────

export interface DanceJuryScore {
  coreografia: number; // 1-100
  vestimenta: number;  // 1-100
  entusiasmo: number;  // 1-100
}

export interface DanceCriteriaWeights {
  coreografia: number; // 0.40
  vestimenta: number;  // 0.30
  entusiasmo: number;  // 0.30
}

export interface PenaltySummary {
  yellowFlags: number;  // cantidad de banderolas amarillas
  redFlags: number;     // cantidad de banderolas rojas
  orderViolation: boolean; // incumplió el orden de ingreso
  manualDeductions: number; // puntos de descuento manual
}

export interface DanceGroupResult {
  juryScores: number[];       // nota de cada jurado
  average: number;            // promedio (o promedio recortado)
  penaltyTotal: number;       // total de penalizaciones
  finalScore: number;         // nota final = max(promedio − penalización, 0)
  penaltyBreakdown: {
    fromYellow: number;       // floor(amarillas/3) × 5
    fromRed: number;          // rojas × 10
    fromOrder: number;        // 5 si incumplió orden
    fromManual: number;       // descuentos manuales
  };
}

const DEFAULT_DANCE_WEIGHTS: DanceCriteriaWeights = {
  coreografia: 0.40,
  vestimenta: 0.30,
  entusiasmo: 0.30,
};

/**
 * Calcula la nota de UN jurado para un grupo de danza.
 *
 * nota_jurado = coreografía × peso_coreografía + vestimenta × peso_vestimenta + entusiasmo × peso_entusiasmo
 */
export function calculateDanceJuryScore(
  score: DanceJuryScore,
  weights: DanceCriteriaWeights = DEFAULT_DANCE_WEIGHTS,
  decimals: number = 2
): number {
  const raw =
    score.coreografia * weights.coreografia +
    score.vestimenta * weights.vestimenta +
    score.entusiasmo * weights.entusiasmo;
  return roundTo(raw, decimals);
}

/**
 * Calcula el total de penalizaciones de un grupo de danza.
 *
 * penalización = floor(amarillas/3) × 5 + rojas × 10 + (5 si incumplió orden) + manuales
 */
export function calculatePenaltyTotal(
  penalties: PenaltySummary,
  config: { yellowThreshold?: number; yellowPenalty?: number; redPenalty?: number; orderPenalty?: number } = {}
): number {
  const {
    yellowThreshold = 3,
    yellowPenalty = 5,
    redPenalty = 10,
    orderPenalty = 5,
  } = config;

  const fromYellow = Math.floor(penalties.yellowFlags / yellowThreshold) * yellowPenalty;
  const fromRed = penalties.redFlags * redPenalty;
  const fromOrder = penalties.orderViolation ? orderPenalty : 0;
  const fromManual = penalties.manualDeductions;

  return fromYellow + fromRed + fromOrder + fromManual;
}

/**
 * Desglosa las penalizaciones sin sumarlas.
 */
export function calculatePenaltyBreakdown(
  penalties: PenaltySummary,
  config: { yellowThreshold?: number; yellowPenalty?: number; redPenalty?: number; orderPenalty?: number } = {}
): DanceGroupResult["penaltyBreakdown"] {
  const {
    yellowThreshold = 3,
    yellowPenalty = 5,
    redPenalty = 10,
    orderPenalty = 5,
  } = config;

  return {
    fromYellow: Math.floor(penalties.yellowFlags / yellowThreshold) * yellowPenalty,
    fromRed: penalties.redFlags * redPenalty,
    fromOrder: penalties.orderViolation ? orderPenalty : 0,
    fromManual: penalties.manualDeductions,
  };
}

/**
 * Calcula el promedio simple de un array de notas.
 */
export function calculateMean(scores: number[], decimals: number = 2): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return roundTo(sum / scores.length, decimals);
}

/**
 * Calcula el promedio recortado (descarta la nota máxima y la mínima).
 * Requiere al menos 3 notas; si hay menos, devuelve el promedio simple.
 */
export function calculateTrimmedMean(scores: number[], decimals: number = 2): number {
  if (scores.length < 3) return calculateMean(scores, decimals);
  const sorted = [...scores].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return calculateMean(trimmed, decimals);
}

/**
 * Calcula la nota final de un grupo de danza.
 *
 * nota_final = max(promedio − penalización_total, 0)
 */
export function calculateDanceGroupFinalScore(
  juryScores: DanceJuryScore[],
  penalties: PenaltySummary,
  options: {
    weights?: DanceCriteriaWeights;
    scoringRule?: "MEAN" | "TRIMMED_MEAN";
    decimals?: number;
    penaltyConfig?: { yellowThreshold?: number; yellowPenalty?: number; redPenalty?: number; orderPenalty?: number };
  } = {}
): DanceGroupResult {
  const {
    weights = DEFAULT_DANCE_WEIGHTS,
    scoringRule = "MEAN",
    decimals = 2,
    penaltyConfig = {},
  } = options;

  // Calcular nota de cada jurado
  const juryTotals = juryScores.map((s) => calculateDanceJuryScore(s, weights, decimals));

  // Calcular promedio
  const average = scoringRule === "TRIMMED_MEAN"
    ? calculateTrimmedMean(juryTotals, decimals)
    : calculateMean(juryTotals, decimals);

  // Calcular penalizaciones
  const penaltyTotal = calculatePenaltyTotal(penalties, penaltyConfig);
  const penaltyBreakdown = calculatePenaltyBreakdown(penalties, penaltyConfig);

  // Nota final: max(promedio - penalización, 0)
  const finalScore = roundTo(Math.max(average - penaltyTotal, 0), decimals);

  return {
    juryScores: juryTotals,
    average,
    penaltyTotal,
    finalScore,
    penaltyBreakdown,
  };
}

// ─── Módulo B: Moperita y Ñusta ─────────────────────────────

export interface RunwayJuryScore {
  runwayType: "GALA" | "CASUAL" | "TIPICA";
  criteriaScores: Array<{
    criterionId: string;
    points: number;
    weight: number;
    maxPoints: number;
  }>;
}

export interface RunwayWeight {
  type: "GALA" | "CASUAL" | "TIPICA";
  weight: number; // debe sumar 1.0 entre todas las pasarelas
}

export interface CandidateResult {
  runwayScores: Array<{
    runwayType: string;
    juryAverages: number[];  // promedio de cada jurado para esta pasarela
    runwayAverage: number;   // promedio entre jurados para esta pasarela
    weight: number;
    weightedScore: number;   // runwayAverage × weight
  }>;
  totalScore: number;        // suma de todos los weightedScores
}

/**
 * Calcula la nota de UN jurado para UNA pasarela.
 * Suma ponderada de los criterios que aplican.
 */
export function calculateRunwayJuryScore(
  scores: RunwayJuryScore["criteriaScores"],
  decimals: number = 2
): number {
  if (scores.length === 0) return 0;
  // Nota normalizada: sum(points × weight) / sum(weight) × maxPoints
  const totalWeight = scores.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = scores.reduce((s, c) => s + (c.points / c.maxPoints) * c.weight, 0);
  return roundTo((weighted / totalWeight) * 100, decimals); // normalizado a 100
}

/**
 * Calcula la nota total de una candidata considerando todas las pasarelas.
 *
 * nota por pasarela por jurado → promedio entre jurados → nota total ponderada
 */
export function calculateCandidateFinalScore(
  // Map: runwayType → array de notas de cada jurado (ya calculadas con calculateRunwayJuryScore)
  runwayJuryScores: Record<string, number[]>,
  runwayWeights: RunwayWeight[],
  options: {
    scoringRule?: "MEAN" | "TRIMMED_MEAN";
    decimals?: number;
  } = {}
): CandidateResult {
  const { scoringRule = "MEAN", decimals = 2 } = options;

  const avgFn = scoringRule === "TRIMMED_MEAN" ? calculateTrimmedMean : calculateMean;

  const runwayScores = runwayWeights.map((rw) => {
    const juryScoresForRunway = runwayJuryScores[rw.type] || [];
    const runwayAverage = avgFn(juryScoresForRunway, decimals);
    const weightedScore = roundTo(runwayAverage * rw.weight, decimals);

    return {
      runwayType: rw.type,
      juryAverages: juryScoresForRunway,
      runwayAverage,
      weight: rw.weight,
      weightedScore,
    };
  });

  const totalScore = roundTo(
    runwayScores.reduce((s, r) => s + r.weightedScore, 0),
    decimals
  );

  return { runwayScores, totalScore };
}

// ─── Desempate ──────────────────────────────────────────────

export interface TieBreakEntry {
  id: string;
  finalScore: number;
  criteriaScores: Record<string, number>; // criterionKey → average score
  penaltyTotal: number;
}

/**
 * Ordena las entradas según el criterio de desempate configurable.
 * Por defecto: mayor nota en criterio de mayor peso → menor penalización → orden original.
 */
export function resolveTieBreak(
  entries: TieBreakEntry[],
  tieBreakOrder: string[] = []
): TieBreakEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Por nota final (descendente)
    if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;

    // 2. Por criterios en orden de desempate
    for (const criterionKey of tieBreakOrder) {
      const aScore = a.criteriaScores[criterionKey] || 0;
      const bScore = b.criteriaScores[criterionKey] || 0;
      if (aScore !== bScore) return bScore - aScore;
    }

    // 3. Por menor penalización
    if (a.penaltyTotal !== b.penaltyTotal) return a.penaltyTotal - b.penaltyTotal;

    // 4. Empate exacto — queda en el orden original
    return 0;
  });
}

// ─── Utilidades ─────────────────────────────────────────────

/**
 * Redondea un número a N decimales.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Valida que los pesos sumen aproximadamente 100% (tolerancia 0.01).
 */
export function validateWeightsSum(weights: number[], tolerance: number = 0.01): boolean {
  const sum = weights.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) <= tolerance;
}
