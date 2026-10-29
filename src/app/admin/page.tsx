import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateDanceGroupFinalScore, type PenaltySummary } from "@/lib/scoring";
import AdminPortalClient, {
  type AdminEditionData,
  type AdminGroupItem,
  type AdminCandidateItem,
  type AdminAuditItem,
} from "@/features/admin/AdminPortalClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  // 1. Obtener edición activa
  const edition = await prisma.edition.findFirst({
    orderBy: { year: "desc" },
  });

  if (!edition) {
    return (
      <div className="p-8 text-center text-slate-400">
        No se encontró ninguna edición activa del certamen. Ejecuta el seed para inicializar.
      </div>
    );
  }

  // 2. Obtener grupos de danza con votos y penalizaciones
  const dbGroups = await prisma.danceGroup.findMany({
    where: { editionId: edition.id },
    include: {
      fraternity: true,
      penalties: { orderBy: { registeredAt: "asc" } },
      danceScores: { where: { status: "SUBMITTED" } },
    },
    orderBy: [{ entryOrder: "asc" }, { createdAt: "asc" }],
  });

  // 3. Verificar si existen votos
  const hasSubmittedVotes = dbGroups.some((g) => g.danceScores.length > 0);

  // 4. Calcular resultados por grupo
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
      scoringRule: edition.scoringRule,
      decimals: edition.decimals,
    });

    return {
      id: g.id,
      entryOrder: g.entryOrder,
      danceName: g.danceName,
      fraternityName: g.fraternity.name,
      university: g.fraternity.university,
      department: g.fraternity.department,
      numberOfDancers: g.numberOfDancers,
      status: g.status,
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

  // Ordenar por nota final (ranking)
  groups.sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    return (b.finalScore || 0) - (a.finalScore || 0);
  });

  // 5. Candidatas
  const dbParticipants = await prisma.participant.findMany({
    where: { category: { editionId: edition.id } },
    include: {
      category: true,
      fraternity: true,
      entries: {
        include: {
          scores: { where: { status: "SUBMITTED" } },
        },
      },
    },
    take: 20,
  });

  const candidates: AdminCandidateItem[] = dbParticipants.map((p) => {
    const totalVotes = p.entries.reduce((sum, e) => sum + e.scores.length, 0);
    return {
      id: p.id,
      fullName: p.fullName,
      categoryName: p.category.name,
      fraternityName: p.fraternity.name,
      university: p.fraternity.university,
      photoUrl: p.photoUrl,
      votesCount: totalVotes,
    };
  });

  // 6. Auditorías recientes
  const dbAudits = await prisma.auditLog.findMany({
    where: { editionId: edition.id },
    orderBy: { createdAt: "desc" },
    take: 15,
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
    adminConfirmedAt: edition.adminConfirmedAt?.toISOString() || null,
    notaryConfirmedAt: edition.notaryConfirmedAt?.toISOString() || null,
    resultsRevealed: edition.resultsRevealed,
    scoringRule: edition.scoringRule,
    decimals: edition.decimals,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AdminPortalClient
        adminName={session.name}
        edition={editionData}
        groups={groups}
        candidates={candidates}
        recentAudits={recentAudits}
        hasSubmittedVotes={hasSubmittedVotes}
      />
    </div>
  );
}
