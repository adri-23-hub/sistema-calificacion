import { prisma } from "@/lib/db";
import { calculateDanceGroupFinalScore, type PenaltySummary } from "@/lib/scoring";
import ResultadosClient, {
  type DanceResultItem,
  type CandidateResultItem,
} from "@/features/resultados/ResultadosClient";

export const dynamic = "force-dynamic";

export default async function ResultadosPage() {
  const edition = await prisma.edition.findFirst({
    orderBy: { year: "desc" },
  });

  if (!edition) {
    return (
      <div className="p-8 text-center text-slate-400">
        No se encontró ninguna edición activa del certamen.
      </div>
    );
  }

  let danceGroups: DanceResultItem[] = [];
  let candidates: CandidateResultItem[] = [];

  // 1. Grupos de danza (Módulo A)
  const dbGroups = await prisma.danceGroup.findMany({
    where: { editionId: edition.id },
    include: {
      fraternity: true,
      penalties: { orderBy: { registeredAt: "asc" } },
      // Solo incluimos votos si los resultados fueron revelados oficialmente
      danceScores: edition.resultsRevealed ? { where: { status: "SUBMITTED" } } : false,
    },
    orderBy: [{ entryOrder: "asc" }],
  });

  danceGroups = dbGroups.map((g) => {
    const penaltySummary: PenaltySummary = {
      yellowFlags: g.penalties.filter((p) => !p.isVoided && p.type === "YELLOW_FLAG").length,
      redFlags: g.penalties.filter((p) => !p.isVoided && p.type === "RED_FLAG").length,
      orderViolation: g.penalties.some((p) => !p.isVoided && p.type === "ORDER_VIOLATION"),
      manualDeductions: g.penalties
        .filter((p) => !p.isVoided && p.type === "MANUAL_DEDUCTION")
        .reduce((sum, p) => sum + p.points, 0),
    };

    const juryScores = edition.resultsRevealed
      ? (g.danceScores || []).map((s) => ({
          coreografia: s.coreografia,
          vestimenta: s.vestimenta,
          entusiasmo: s.entusiasmo,
        }))
      : [];

    const result = edition.resultsRevealed
      ? calculateDanceGroupFinalScore(juryScores, penaltySummary, {
          scoringRule: edition.scoringRule,
          decimals: edition.decimals,
        })
      : {
          juryScores: [],
          average: 0,
          penaltyTotal: 0,
          finalScore: 0,
          penaltyBreakdown: { fromYellow: 0, fromRed: 0, fromOrder: 0, fromManual: 0 },
        };

    return {
      puesto: 0,
      id: g.id,
      entryOrder: g.entryOrder,
      danceName: g.danceName,
      fraternityName: g.fraternity.name,
      university: g.fraternity.university,
      department: g.fraternity.department,
      numberOfDancers: g.numberOfDancers,
      average: result.average,
      yellowFlags: penaltySummary.yellowFlags,
      redFlags: penaltySummary.redFlags,
      orderViolation: penaltySummary.orderViolation,
      manualDeductions: penaltySummary.manualDeductions,
      penaltyTotal: result.penaltyTotal,
      finalScore: result.finalScore,
      isDisqualified: g.isDisqualified,
      disqualifyReason: g.disqualifyReason,
    };
  });

  // Ordenar ranking si está revelado
  if (edition.resultsRevealed) {
    danceGroups.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      return b.finalScore - a.finalScore;
    });

    danceGroups.forEach((g, idx) => {
      g.puesto = g.isDisqualified ? "DESCALIFICADO" : idx + 1;
    });
  }

  // 2. Candidatas (Módulo B)
  if (edition.resultsRevealed) {
    const dbCandidates = await prisma.participant.findMany({
      where: { category: { editionId: edition.id } },
      include: {
        category: true,
        fraternity: true,
        entries: {
          include: {
            runway: true,
            scores: {
              where: { status: "SUBMITTED" },
            },
          },
        },
      },
    });

    candidates = dbCandidates.map((c) => {
      let galaScore = 0;
      let casualScore = 0;
      let tipicaScore = 0;

      for (const entry of c.entries) {
        const scoreValues = entry.scores.map((s) => s.rawTotal || 0);
        const avg = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0;
        if (entry.runway?.type === "GALA") galaScore = avg;
        else if (entry.runway?.type === "CASUAL") casualScore = avg;
        else if (entry.runway?.type === "TIPICA") tipicaScore = avg;
      }

      const totalScore = (galaScore + casualScore + tipicaScore) / 3;

      return {
        puesto: 0,
        id: c.id,
        fullName: c.fullName,
        categoryName: c.category.name,
        fraternityName: c.fraternity.name,
        university: c.fraternity.university,
        photoUrl: c.photoUrl,
        galaScore,
        casualScore,
        tipicaScore,
        totalScore,
      };
    });

    candidates.sort((a, b) => b.totalScore - a.totalScore);
    candidates.forEach((c, idx) => {
      c.puesto = idx + 1;
    });
  }

  return (
    <ResultadosClient
      editionName={edition.name}
      year={edition.year}
      resultsRevealed={edition.resultsRevealed}
      adminConfirmedAt={edition.adminConfirmedAt?.toISOString() || null}
      notaryConfirmedAt={edition.notaryConfirmedAt?.toISOString() || null}
      danceGroups={danceGroups}
      candidates={candidates}
    />
  );
}
