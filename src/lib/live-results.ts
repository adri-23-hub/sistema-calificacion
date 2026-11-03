import { prisma } from "@/lib/db";
import {
  calculateCandidateFinalScore,
  calculateDanceGroupFinalScore,
  type PenaltySummary,
} from "@/lib/scoring";
import {
  latestDate,
  rankCandidateItems,
  rankDanceItems,
  summarizeLiveItems,
} from "@/lib/live-ranking";
import type {
  LiveCandidateItem,
  LiveCategoryGroup,
  LiveCurrent,
  LiveDanceItem,
  LiveDanceStatus,
  LiveResultsPayload,
  LiveRunwayItem,
  LiveRunwayType,
} from "@/features/live/types";

interface ModuleAWeights {
  coreografia: number;
  vestimenta: number;
  entusiasmo: number;
}

export interface ModuleAConfig {
  weights: ModuleAWeights;
  scoringRule: "MEAN" | "TRIMMED_MEAN";
  penaltyOrder: "BEFORE_AVERAGE" | "AFTER_AVERAGE";
}

const DEFAULT_MODULE_A_WEIGHTS: ModuleAWeights = {
  coreografia: 0.4,
  vestimenta: 0.3,
  entusiasmo: 0.3,
};

const DEFAULT_RUNWAYS: Array<{ type: LiveRunwayType; name: string; weight: number }> = [
  { type: "GALA", name: "Ropa de Gala", weight: 1 / 3 },
  { type: "CASUAL", name: "Ropa Casual", weight: 1 / 3 },
  { type: "TIPICA", name: "Ropa Típica", weight: 1 / 3 },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeModuleAWeights(weights: ModuleAWeights): ModuleAWeights {
  const sum = weights.coreografia + weights.vestimenta + weights.entusiasmo;
  if (sum <= 0) return DEFAULT_MODULE_A_WEIGHTS;

  return {
    coreografia: weights.coreografia / sum,
    vestimenta: weights.vestimenta / sum,
    entusiasmo: weights.entusiasmo / sum,
  };
}

export function readModuleAConfig(
  configs: Array<{ key: string; value: unknown }>,
  editionScoringRule: "MEAN" | "TRIMMED_MEAN"
): ModuleAConfig {
  const config =
    configs.find((item) => item.key === "moduleA.weights") ??
    configs.find((item) => item.key === "moduleA.criteria.weights");

  const penaltyOrderRow = configs.find((item) => item.key === "moduleA.penalty.order");
  const penaltyOrder: "BEFORE_AVERAGE" | "AFTER_AVERAGE" =
    penaltyOrderRow?.value === "BEFORE_AVERAGE" ? "BEFORE_AVERAGE" : "AFTER_AVERAGE";

  if (!config || !isRecord(config.value)) {
    return {
      weights: DEFAULT_MODULE_A_WEIGHTS,
      scoringRule: editionScoringRule,
      penaltyOrder,
    };
  }

  const coreografia = readNumber(config.value.coreografia);
  const vestimenta = readNumber(config.value.vestimenta);
  const entusiasmo = readNumber(config.value.entusiasmo);

  if (coreografia === null || vestimenta === null || entusiasmo === null) {
    return {
      weights: DEFAULT_MODULE_A_WEIGHTS,
      scoringRule: editionScoringRule,
      penaltyOrder,
    };
  }

  const scoringRuleValue = config.value.scoringRule;
  const scoringRule: "MEAN" | "TRIMMED_MEAN" =
    scoringRuleValue === "TRIMMED_MEAN" || scoringRuleValue === "MEAN"
      ? scoringRuleValue
      : editionScoringRule;

  return {
    weights: normalizeModuleAWeights({ coreografia, vestimenta, entusiasmo }),
    scoringRule,
    penaltyOrder,
  };
}

function buildRunwayWeights(
  runways: Array<{ type: LiveRunwayType; name: string; weight: number }>,
  configuredWeights?: unknown
): Array<{ type: LiveRunwayType; name: string; weight: number }> {
  if (isRecord(configuredWeights)) {
    const gala = readNumber(configuredWeights.GALA) ?? readNumber(configuredWeights.gala);
    const casual = readNumber(configuredWeights.CASUAL) ?? readNumber(configuredWeights.casual);
    const tipica = readNumber(configuredWeights.TIPICA) ?? readNumber(configuredWeights.tipica);
    if (gala !== null && casual !== null && tipica !== null) {
      const sum = gala + casual + tipica;
      if (sum > 0) {
        return [
          { type: "GALA", name: "Ropa de Gala", weight: gala / sum },
          { type: "CASUAL", name: "Ropa Casual", weight: casual / sum },
          { type: "TIPICA", name: "Ropa Típica", weight: tipica / sum },
        ];
      }
    }
  }

  if (runways.length === 0) return DEFAULT_RUNWAYS;

  const sum = runways.reduce((total, runway) => total + Math.max(runway.weight, 0), 0);
  if (sum <= 0) {
    return runways.map((runway) => ({
      ...runway,
      weight: 1 / runways.length,
    }));
  }

  return runways.map((runway) => ({
    ...runway,
    weight: Math.max(runway.weight, 0) / sum,
  }));
}

function normalizeRunwayScore(rawTotal: number, totalPoints: number | null): number {
  const max = totalPoints && totalPoints > 0 ? totalPoints : 40;
  return Math.max(0, Math.min(100, (rawTotal / max) * 100));
}

function entryOrderValue(item: { entryOrder: number | null }): number {
  return item.entryOrder ?? Number.MAX_SAFE_INTEGER;
}

function pickLatestByVote<T extends { lastVoteAt: string | null }>(items: T[]): T | null {
  return (
    items
      .filter((item) => item.lastVoteAt)
      .sort(
        (a, b) =>
          new Date(b.lastVoteAt as string).getTime() -
          new Date(a.lastVoteAt as string).getTime()
      )[0] ?? null
  );
}

/**
 * Obtiene y calcula los resultados públicos en vivo de una edición.
 *
 * Devuelve únicamente datos agregados. No incluye nombres de jurados ni
 * calificaciones individuales, para no exponer el detalle de cada voto.
 */
export async function getLiveResults(
  editionId?: string
): Promise<LiveResultsPayload | null> {
  const edition = editionId
    ? await prisma.edition.findUnique({ where: { id: editionId } })
    : await prisma.edition.findFirst({ orderBy: { year: "desc" } });

  if (!edition) return null;

  const [configs, dbGroups, dbCategories, dbParticipants, currentEntry, juryCountA, juryCountB] =
    await Promise.all([
      prisma.eventConfig.findMany({
        where: {
          editionId: edition.id,
          key: {
            in: [
              "moduleA.weights",
              "moduleA.criteria.weights",
              "moduleA.penalty.order",
              "moduleB.runway.weights",
              "moduleB.criteria.weights",
              "general.scoringRule",
              "general.decimals",
              "general.juryCount",
            ],
          },
        },
        select: { key: true, value: true },
      }),
      prisma.danceGroup.findMany({
        where: { editionId: edition.id },
        include: {
          fraternity: {
            select: {
              name: true,
              university: true,
              department: true,
            },
          },
          penalties: {
            where: { isVoided: false },
            select: { type: true, points: true },
          },
          danceScores: {
            where: { status: "SUBMITTED" },
            select: {
              coreografia: true,
              vestimenta: true,
              entusiasmo: true,
              submittedAt: true,
            },
          },
        },
        orderBy: [{ entryOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.category.findMany({
        where: { editionId: edition.id },
        include: {
          runways: { orderBy: { order: "asc" } },
        },
        orderBy: { order: "asc" },
      }),
      prisma.participant.findMany({
        where: {
          category: { editionId: edition.id },
          isActive: true,
        },
        include: {
          category: {
            select: { id: true, name: true, status: true },
          },
          fraternity: {
            select: { name: true, university: true },
          },
          entries: {
            include: {
              runway: true,
              scores: {
                where: { status: "SUBMITTED" },
                select: {
                  rawTotal: true,
                  submittedAt: true,
                  rubric: { select: { totalPoints: true } },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.entry.findFirst({
        where: {
          status: "IN_SCORING",
          category: { editionId: edition.id },
        },
        include: {
          participant: {
            include: {
              category: { select: { name: true } },
              fraternity: { select: { name: true } },
            },
          },
          scores: {
            where: { status: "SUBMITTED" },
            select: { id: true },
          },
        },
        orderBy: [{ startedAt: "desc" }, { order: "asc" }],
      }),
      prisma.juryAssignment.count({
        where: {
          editionId: edition.id,
          isActive: true,
          OR: [{ assignedModule: null }, { assignedModule: "ENTRADA_FOLKLORICA" }],
        },
      }),
      prisma.juryAssignment.count({
        where: {
          editionId: edition.id,
          isActive: true,
          OR: [{ assignedModule: null }, { assignedModule: "MOPERITA_NUSTA" }],
        },
      }),
    ]);

  const configuredDecimals = readNumber(
    configs.find((c) => c.key === "general.decimals")?.value
  );
  const activeDecimals =
    configuredDecimals !== null
      ? Math.min(4, Math.max(0, configuredDecimals))
      : edition.decimals;

  const configuredScoringRule = configs.find(
    (c) => c.key === "general.scoringRule"
  )?.value;
  const activeScoringRule =
    configuredScoringRule === "TRIMMED_MEAN" || configuredScoringRule === "MEAN"
      ? (configuredScoringRule as "MEAN" | "TRIMMED_MEAN")
      : (edition.scoringRule as "MEAN" | "TRIMMED_MEAN");

  const moduleAConfig = readModuleAConfig(configs, activeScoringRule);
  const runwayWeightsConfig = configs.find(
    (c) => c.key === "moduleB.runway.weights"
  )?.value;

  // ─── Módulo A: grupos de danza ────────────────────────────
  const danceItems: LiveDanceItem[] = dbGroups.map((group) => {
    const penaltySummary: PenaltySummary = {
      yellowFlags: group.penalties.filter((penalty) => penalty.type === "YELLOW_FLAG").length,
      redFlags: group.penalties.filter((penalty) => penalty.type === "RED_FLAG").length,
      orderViolation: group.penalties.some((penalty) => penalty.type === "ORDER_VIOLATION"),
      manualDeductions: group.penalties
        .filter((penalty) => penalty.type === "MANUAL_DEDUCTION")
        .reduce((sum, penalty) => sum + penalty.points, 0),
    };

    const juryScores = group.danceScores.map((score) => ({
      coreografia: score.coreografia,
      vestimenta: score.vestimenta,
      entusiasmo: score.entusiasmo,
    }));

    const result = calculateDanceGroupFinalScore(juryScores, penaltySummary, {
      weights: moduleAConfig.weights,
      scoringRule: moduleAConfig.scoringRule,
      decimals: activeDecimals,
      penaltyOrder: moduleAConfig.penaltyOrder,
    });

    const lastVoteAt = group.danceScores.reduce<string | null>(
      (latest, score) => latestDate(latest, score.submittedAt.toISOString()),
      null
    );

    return {
      id: group.id,
      entryOrder: group.entryOrder,
      danceName: group.danceName,
      fraternityName: group.fraternity.name,
      university: group.fraternity.university,
      department: group.fraternity.department,
      numberOfDancers: group.numberOfDancers,
      status: (group.isDisqualified ? "DISQUALIFIED" : group.status) as LiveDanceStatus,
      isDisqualified: group.isDisqualified,
      disqualifyReason: group.disqualifyReason,
      votesCount: group.danceScores.length,
      juryCount: juryCountA,
      average: result.average,
      penaltyTotal: result.penaltyTotal,
      finalScore: result.finalScore,
      yellowFlags: penaltySummary.yellowFlags,
      redFlags: penaltySummary.redFlags,
      orderViolation: penaltySummary.orderViolation,
      manualDeductions: penaltySummary.manualDeductions,
      rank: null,
      lastVoteAt,
    };
  });

  const rankedDanceItems = rankDanceItems(danceItems);
  const moduleASummary = summarizeLiveItems(rankedDanceItems, juryCountA);

  const currentDance =
    danceItems
      .filter((item) => item.status === "IN_SCORING")
      .sort((a, b) => entryOrderValue(a) - entryOrderValue(b))[0] ??
    pickLatestByVote(danceItems);

  const moduleACurrent: LiveCurrent | null = currentDance
    ? {
        module: "A",
        name: currentDance.danceName,
        fraternityName: currentDance.fraternityName,
        votesCount: currentDance.votesCount,
        juryCount: juryCountA,
      }
    : null;

  // ─── Módulo B: candidatas ─────────────────────────────────
  const categoryById = new Map(dbCategories.map((category) => [category.id, category]));

  const candidateItems: LiveCandidateItem[] = dbParticipants.map((participant) => {
    const category = categoryById.get(participant.categoryId);
    const categoryRunways = (category?.runways ?? []).map((runway) => ({
      type: runway.type as LiveRunwayType,
      name: runway.name,
      weight: runway.weight,
    }));
    const runwayWeights = buildRunwayWeights(categoryRunways, runwayWeightsConfig);

    const runwayJuryScores: Record<LiveRunwayType, number[]> = {
      GALA: [],
      CASUAL: [],
      TIPICA: [],
    };
    const runwayVotes: Record<LiveRunwayType, number> = {
      GALA: 0,
      CASUAL: 0,
      TIPICA: 0,
    };

    let lastVoteAt: string | null = null;

    for (const entry of participant.entries) {
      const runwayType = entry.runway?.type as LiveRunwayType | undefined;
      if (!runwayType || !(runwayType in runwayJuryScores)) continue;

      for (const score of entry.scores) {
        if (score.rawTotal === null) continue;

        runwayJuryScores[runwayType].push(
          normalizeRunwayScore(score.rawTotal, score.rubric?.totalPoints ?? null)
        );
        runwayVotes[runwayType] += 1;

        if (score.submittedAt) {
          lastVoteAt = latestDate(lastVoteAt, score.submittedAt.toISOString());
        }
      }
    }

    const candidateResult = calculateCandidateFinalScore(
      runwayJuryScores,
      runwayWeights.map((runway) => ({ type: runway.type, weight: runway.weight })),
      {
        scoringRule: activeScoringRule,
        decimals: activeDecimals,
      }
    );

    const runways: LiveRunwayItem[] = runwayWeights.map((runway) => {
      const result = candidateResult.runwayScores.find(
        (item) => item.runwayType === runway.type
      );

      return {
        type: runway.type,
        name: runway.name,
        average: result?.runwayAverage ?? 0,
        weight: runway.weight,
        votesCount: runwayVotes[runway.type],
        juryCount: juryCountB,
      };
    });

    return {
      id: participant.id,
      fullName: participant.fullName,
      categoryId: participant.categoryId,
      categoryName: participant.category.name,
      fraternityName: participant.fraternity.name,
      university: participant.fraternity.university,
      photoUrl: participant.photoUrl,
      votesCount: runways.reduce((sum, runway) => sum + runway.votesCount, 0),
      juryCount: juryCountB,
      runways,
      totalScore: candidateResult.totalScore,
      rank: null,
      lastVoteAt,
    };
  });

  const candidateCategories: LiveCategoryGroup[] = dbCategories
    .filter((category) => category.moduleType === "MOPERITA_NUSTA")
    .map((category) => ({
      id: category.id,
      name: category.name,
      status: category.status,
      items: rankCandidateItems(
        candidateItems.filter((item) => item.categoryId === category.id)
      ),
    }));

  const allCandidateItems = candidateCategories.flatMap((category) => category.items);
  const moduleBSummary = summarizeLiveItems(allCandidateItems, juryCountB);

  const latestCandidate = pickLatestByVote(allCandidateItems);
  const moduleBCurrent: LiveCurrent | null = currentEntry
    ? {
        module: "B",
        name: currentEntry.participant.fullName,
        fraternityName: currentEntry.participant.fraternity.name,
        categoryName: currentEntry.participant.category.name,
        votesCount: currentEntry.scores.length,
        juryCount: juryCountB,
      }
    : latestCandidate
      ? {
          module: "B",
          name: latestCandidate.fullName,
          fraternityName: latestCandidate.fraternityName,
          categoryName: latestCandidate.categoryName,
          votesCount: latestCandidate.votesCount,
          juryCount: juryCountB,
        }
      : null;

  return {
    updatedAt: new Date().toISOString(),
    edition: {
      id: edition.id,
      name: edition.name,
      year: edition.year,
      venue: edition.venue,
    },
    moduleA: {
      items: rankedDanceItems,
      summary: moduleASummary,
      current: moduleACurrent,
      isFinal:
        rankedDanceItems.length > 0 &&
        rankedDanceItems.every(
          (item) => item.status === "CLOSED" || item.isDisqualified
        ),
    },
    moduleB: {
      categories: candidateCategories,
      summary: moduleBSummary,
      current: moduleBCurrent,
      isFinal:
        candidateCategories.length > 0 &&
        candidateCategories.every((category) => category.status === "CLOSED"),
    },
  };
}
