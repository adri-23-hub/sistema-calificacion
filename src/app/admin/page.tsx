import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveEdition } from "@/lib/active-edition";
import {
  calculateDanceGroupFinalScore,
  calculateCandidateFinalScore,
  type PenaltySummary,
  type RunwayWeight,
} from "@/lib/scoring";
import { readModuleAConfig } from "@/lib/live-results";
import { rankCandidateItems } from "@/lib/live-ranking";
import AdminPortalClient, {
  type AdminEditionData,
  type AdminGroupItem,
  type AdminCandidateItem,
  type AdminAuditItem,
  type AdminConfigData,
} from "@/features/admin/AdminPortalClient";
import type { AdminFraternityOption } from "@/features/admin/components/DanceRegistrationModal";
import type { CandidateCategoryOption } from "@/features/admin/candidate-types";

export const dynamic = "force-dynamic";

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  // 1. Obtener edición activa
  const edition = await getActiveEdition();

  if (!edition) {
    return (
      <div className="p-8 text-center text-slate-400">
        No hay una edición activa del certamen. Activa una edición antes de registrar fraternidades, danzas o fotografías.
      </div>
    );
  }

  // 2. Obtener todas las configuraciones de la edición
  const dbConfigs = await prisma.eventConfig.findMany({
    where: { editionId: edition.id },
    select: { key: true, value: true },
  });

  const configMap = new Map<string, unknown>(dbConfigs.map((c) => [c.key, c.value]));

  // Configuración Módulo A
  const moduleAConfig = readModuleAConfig(
    dbConfigs,
    edition.scoringRule as "MEAN" | "TRIMMED_MEAN"
  );

  // Parámetros generales
  const configuredDecimals = readNumber(configMap.get("general.decimals"));
  const activeDecimals =
    configuredDecimals !== null
      ? Math.min(4, Math.max(0, configuredDecimals))
      : edition.decimals;

  const configuredScoringRule = configMap.get("general.scoringRule");
  const activeScoringRule: "MEAN" | "TRIMMED_MEAN" =
    configuredScoringRule === "TRIMMED_MEAN" || configuredScoringRule === "MEAN"
      ? (configuredScoringRule as "MEAN" | "TRIMMED_MEAN")
      : (edition.scoringRule as "MEAN" | "TRIMMED_MEAN");

  const penaltyOrderVal = configMap.get("moduleA.penalty.order");
  const activePenaltyOrder: "BEFORE_AVERAGE" | "AFTER_AVERAGE" =
    penaltyOrderVal === "BEFORE_AVERAGE" ? "BEFORE_AVERAGE" : "AFTER_AVERAGE";

  // Pesos de pasarelas Módulo B
  const runwayWeightsVal = configMap.get("moduleB.runway.weights");
  let galaW = 34;
  let casualW = 33;
  let tipicaW = 33;
  if (isRecord(runwayWeightsVal)) {
    const g = readNumber(runwayWeightsVal.GALA);
    const c = readNumber(runwayWeightsVal.CASUAL);
    const t = readNumber(runwayWeightsVal.TIPICA);
    if (g !== null && c !== null && t !== null) {
      galaW = g > 1.5 ? Math.round(g) : Math.round(g * 100);
      casualW = c > 1.5 ? Math.round(c) : Math.round(c * 100);
      tipicaW = t > 1.5 ? Math.round(t) : Math.round(t * 100);
    }
  }

  // Pesos de 4 criterios Módulo B
  const criteriaWeightsVal = configMap.get("moduleB.criteria.weights");
  let porteW = 25;
  let carismaW = 25;
  let autenticidadW = 25;
  let originalidadW = 25;
  if (isRecord(criteriaWeightsVal)) {
    const p = readNumber(criteriaWeightsVal.porteElegancia);
    const c = readNumber(criteriaWeightsVal.carismaSimpatia);
    const a = readNumber(criteriaWeightsVal.autenticidadTraje);
    const o = readNumber(criteriaWeightsVal.originalidadEstilo);
    if (p !== null && c !== null && a !== null && o !== null) {
      porteW = p > 1.5 ? Math.round(p) : Math.round(p * 100);
      carismaW = c > 1.5 ? Math.round(c) : Math.round(c * 100);
      autenticidadW = a > 1.5 ? Math.round(a) : Math.round(a * 100);
      originalidadW = o > 1.5 ? Math.round(o) : Math.round(o * 100);
    }
  }

  // Jurados esperados
  const juryCountVal = configMap.get("general.juryCount");
  let jurorsModA = 5;
  let jurorsModB = 5;
  if (isRecord(juryCountVal)) {
    jurorsModA = readNumber(juryCountVal.moduleA) ?? 5;
    jurorsModB = readNumber(juryCountVal.moduleB) ?? 5;
  }

  // Criterio de desempate
  const tieBreakVal = configMap.get("general.tieBreak");
  const tieBreakOrder = Array.isArray(tieBreakVal)
    ? tieBreakVal.map(String)
    : ["coreografia", "vestimenta", "entusiasmo"];

  // 3. Obtener grupos de danza con votos y penalizaciones
  const dbGroups = await prisma.danceGroup.findMany({
    where: { editionId: edition.id },
    include: {
      fraternity: true,
      penalties: { orderBy: { registeredAt: "asc" } },
      danceScores: { where: { status: "SUBMITTED" } },
    },
    orderBy: [{ entryOrder: "asc" }, { createdAt: "asc" }],
  });

  // 3.b Fraternidades de la edición (para el registro de danzas)
  const dbFraternities = await prisma.fraternity.findMany({
    where: { editionId: edition.id },
    include: { danceGroups: { select: { id: true } } },
    orderBy: { name: "asc" },
  });

  const fraternities: AdminFraternityOption[] = dbFraternities.map((f) => ({
    id: f.id,
    name: f.name,
    university: f.university,
    faculty: f.faculty,
    city: f.city,
    department: f.department,
    logoUrl: f.logoUrl,
    hasDanceGroup: f.danceGroups.length > 0,
  }));

  // 4. Calcular resultados por grupo de danza (Concurso B)
  const groups: AdminGroupItem[] = dbGroups.map((g) => {
    const penaltySummary: PenaltySummary = {
      yellowFlags: g.penalties.filter((p) => !p.isVoided && p.type === "YELLOW_FLAG").length,
      redFlags: g.penalties.filter((p) => !p.isVoided && p.type === "RED_FLAG").length,
      orderViolation: g.penalties.some((p) => !p.isVoided && p.type === "ORDER_VIOLATION"),
      manualDeductions: g.penalties
        .filter((p) => !p.isVoided && p.type === "MANUAL_DEDUCTION")
        .reduce((sum, p) => sum + p.points, 0),
    };

    const juryScores = g.danceScores.map((s) => ({
      coreografia: s.coreografia,
      vestimenta: s.vestimenta,
      entusiasmo: s.entusiasmo,
    }));

    const result = calculateDanceGroupFinalScore(juryScores, penaltySummary, {
      weights: moduleAConfig.weights,
      scoringRule: activeScoringRule,
      decimals: activeDecimals,
      penaltyOrder: activePenaltyOrder,
    });

    return {
      id: g.id,
      entryOrder: g.entryOrder,
      danceName: g.danceName,
      photoUrl: g.photoUrl,
      fraternityId: g.fraternityId,
      fraternityName: g.fraternity.name,
      university: g.fraternity.university,
      department: g.fraternity.department,
      numberOfDancers: g.numberOfDancers,
      status: g.status as "PENDING" | "IN_SCORING" | "CLOSED",
      hasCaratula: g.hasCaratula,
      hasMonografia: g.hasMonografia,
      hasDancerList: g.hasDancerList,
      hasInvitation: g.hasInvitation,
      isDisqualified: g.isDisqualified,
      disqualifyReason: g.disqualifyReason,
      arrivalTime: g.arrivalTime?.toISOString() || null,
      votesCount: g.danceScores.length,
      averageScore: result.average,
      penaltiesTotal: result.penaltyTotal,
      finalScore: result.finalScore,
      penalties: g.penalties.map((p) => ({
        id: p.id,
        type: p.type,
        points: p.points,
        observation: p.observation,
        registeredAt: p.registeredAt.toISOString(),
        registeredBy: p.registeredBy,
        isVoided: p.isVoided,
      })),
    };
  });

  // Ordenar danzas por nota final (ranking)
  groups.sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    return (b.finalScore || 0) - (a.finalScore || 0);
  });

  // 5. Candidatas (Concurso A: Moperita y Ñusta de Bolivia)
  const dbCandidateCategories = await prisma.category.findMany({
    where: { editionId: edition.id, moduleType: "MOPERITA_NUSTA", slug: { in: ["moperita", "nusta"] } },
    select: { id: true, name: true, slug: true, status: true, runways: { select: { type: true } }, participants: { select: { fraternityId: true } } },
    orderBy: { order: "asc" },
  });
  const candidateCategories: CandidateCategoryOption[] = dbCandidateCategories.map((category) => ({
    id: category.id, name: category.name, slug: category.slug, status: category.status,
    hasRunways: ["GALA", "CASUAL", "TIPICA"].every((type) => category.runways.some((runway) => runway.type === type)),
    occupiedFraternityIds: category.participants.map((participant) => participant.fraternityId),
  }));
  const dbParticipants = await prisma.participant.findMany({
    where: { category: { editionId: edition.id }, isActive: true },
    include: {
      category: true,
      fraternity: true,
      entries: {
        include: {
          runway: true,
          scores: {
            where: { status: "SUBMITTED" },
            include: { rubric: true },
          },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const runwayWeightsForCalc: RunwayWeight[] = [
    { type: "GALA", weight: galaW / 100 },
    { type: "CASUAL", weight: casualW / 100 },
    { type: "TIPICA", weight: tipicaW / 100 },
  ];

  const rawCandidates: AdminCandidateItem[] = dbParticipants.map((p) => {
    const runwayJuryScores: Record<string, number[]> = {
      GALA: [],
      CASUAL: [],
      TIPICA: [],
    };

    let totalVotes = 0;

    for (const entry of p.entries) {
      const rwType = entry.runway?.type;
      if (!rwType || !(rwType in runwayJuryScores)) continue;

      for (const score of entry.scores) {
        if (score.rawTotal === null) continue;
        const maxPoints = score.rubric?.totalPoints || 40;
        // Normalizado a 100
        const normScore = Math.max(0, Math.min(100, (score.rawTotal / maxPoints) * 100));
        runwayJuryScores[rwType].push(normScore);
        totalVotes += 1;
      }
    }

    const calcResult = calculateCandidateFinalScore(
      runwayJuryScores,
      runwayWeightsForCalc,
      {
        scoringRule: activeScoringRule,
        decimals: activeDecimals,
      }
    );

    const galaScore = calcResult.runwayScores.find((r) => r.runwayType === "GALA");
    const casualScore = calcResult.runwayScores.find((r) => r.runwayType === "CASUAL");
    const tipicaScore = calcResult.runwayScores.find((r) => r.runwayType === "TIPICA");

    return {
      id: p.id,
      fullName: p.fullName,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      categorySlug: p.category.slug,
      fraternityId: p.fraternityId,
      career: p.career,
      fraternityName: p.fraternity.name,
      university: p.fraternity.university,
      photoUrl: p.photoUrl,
      votesCount: totalVotes,
      galaAverage: galaScore?.runwayAverage,
      casualAverage: casualScore?.runwayAverage,
      tipicaAverage: tipicaScore?.runwayAverage,
      totalScore: calcResult.totalScore,
      rank: null,
    };
  });

  // Clasificar y rankear candidatas por categoría (Moperita y Ñusta por separado)
  const moperitaCandidates = rawCandidates.filter((c) => c.categorySlug === "moperita");
  const nustaCandidates = rawCandidates.filter((c) => c.categorySlug === "nusta");

  const rankedMoperita = rankCandidateItems(
    moperitaCandidates.map((c) => ({
      ...c,
      juryCount: jurorsModB,
      runways: [],
      lastVoteAt: null,
      totalScore: c.totalScore || 0,
      rank: c.rank ?? null,
    }))
  ).map((ranked) => ({
    ...moperitaCandidates.find((c) => c.id === ranked.id)!,
    rank: ranked.rank,
  }));

  const rankedNusta = rankCandidateItems(
    nustaCandidates.map((c) => ({
      ...c,
      juryCount: jurorsModB,
      runways: [],
      lastVoteAt: null,
      totalScore: c.totalScore || 0,
      rank: c.rank ?? null,
    }))
  ).map((ranked) => ({
    ...nustaCandidates.find((c) => c.id === ranked.id)!,
    rank: ranked.rank,
  }));

  const allCandidates: AdminCandidateItem[] = [...rankedMoperita, ...rankedNusta];

  // 6. Verificar si existen votos emitidos
  const hasSubmittedVotes =
    dbGroups.some((g) => g.danceScores.length > 0) ||
    dbParticipants.some((p) => p.entries.some((e) => e.scores.length > 0));

  // 7. Auditorías recientes
  const dbAudits = await prisma.auditLog.findMany({
    where: { editionId: edition.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const recentAudits: AdminAuditItem[] = dbAudits.map((a) => ({
    id: a.id,
    type: a.type,
    entityType: a.entityType || undefined,
    createdAt: a.createdAt.toISOString(),
    metadata: a.metadata,
  }));

  const editionData: AdminEditionData = {
    id: edition.id,
    name: edition.name,
    year: edition.year,
    scoringRule: activeScoringRule,
    decimals: activeDecimals,
  };

  const initialConfigs: AdminConfigData = {
    coreografiaWeight: Math.round(moduleAConfig.weights.coreografia * 100),
    vestimentaWeight: Math.round(moduleAConfig.weights.vestimenta * 100),
    entusiasmoWeight: Math.round(moduleAConfig.weights.entusiasmo * 100),
    penaltyOrder: activePenaltyOrder,
    galaWeight: galaW,
    casualWeight: casualW,
    tipicaWeight: tipicaW,
    porteWeight: porteW,
    carismaWeight: carismaW,
    autenticidadWeight: autenticidadW,
    originalidadWeight: originalidadW,
    scoringRule: activeScoringRule,
    decimals: activeDecimals,
    jurorsModuleA: jurorsModA,
    jurorsModuleB: jurorsModB,
    tieBreakOrder,
  };

  return (
    <div className="min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-6">
      <AdminPortalClient
        adminName={session.name}
        edition={editionData}
        fraternities={fraternities}
        groups={groups}
        candidates={allCandidates}
        candidateCategories={candidateCategories}
        recentAudits={recentAudits}
        hasSubmittedVotes={hasSubmittedVotes}
        initialConfigs={initialConfigs}
      />
    </div>
  );
}
