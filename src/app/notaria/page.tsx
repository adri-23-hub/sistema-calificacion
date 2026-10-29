import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NotariaClient, {
  type NotaryEditionData,
  type NotaryVotingStatusItem,
  type NotaryAuditItem,
} from "@/features/notaria/NotariaClient";

export const dynamic = "force-dynamic";

export default async function NotariaPage() {
  const session = await getSession();

  if (!session || (session.role !== "NOTARIO" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  const edition = await prisma.edition.findFirst({
    orderBy: { year: "desc" },
  });

  if (!edition) {
    return (
      <div className="p-8 text-center text-slate-400">
        No se encontró ninguna edición activa.
      </div>
    );
  }

  // Grupos de danza y votos
  const dbGroups = await prisma.danceGroup.findMany({
    where: { editionId: edition.id },
    include: {
      fraternity: true,
      danceScores: { where: { status: "SUBMITTED" } },
    },
    orderBy: [{ entryOrder: "asc" }],
  });

  // Candidatas y votos
  const dbCandidates = await prisma.participant.findMany({
    where: { category: { editionId: edition.id } },
    include: {
      fraternity: true,
      category: true,
      entries: {
        include: {
          scores: { where: { status: "SUBMITTED" } },
        },
      },
    },
  });

  // Mapeo a progreso de votación (sin devolver notas si resultsRevealed es false)
  const votingProgress: NotaryVotingStatusItem[] = [
    ...dbGroups.map((g) => ({
      id: g.id,
      name: g.danceName,
      type: "GRUPO_DANZA" as const,
      fraternityName: g.fraternity.name,
      votesCount: g.danceScores.length,
      status: g.isDisqualified ? "DESCALIFICADO" : g.status,
      scoreStatusText: edition.resultsRevealed ? "DISPONIBLE" : "SOBRE CERRADO",
    })),
    ...dbCandidates.map((c) => ({
      id: c.id,
      name: `${c.fullName} (${c.category.name})`,
      type: "CANDIDATA" as const,
      fraternityName: c.fraternity.name,
      votesCount: c.entries.reduce((sum, e) => sum + e.scores.length, 0),
      status: c.isActive ? "ACTIVO" : "INACTIVO",
      scoreStatusText: edition.resultsRevealed ? "DISPONIBLE" : "SOBRE CERRADO",
    })),
  ];

  // Logs de auditoría
  const dbAudits = await prisma.auditLog.findMany({
    where: { editionId: edition.id },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const auditLogs: NotaryAuditItem[] = dbAudits.map((a) => ({
    id: a.id,
    type: a.type,
    actorName: a.actor?.name || "Sistema",
    entityType: a.entityType || undefined,
    createdAt: a.createdAt.toISOString(),
    metadata: a.metadata,
  }));

  const editionData: NotaryEditionData = {
    id: edition.id,
    name: edition.name,
    year: edition.year,
    adminConfirmedAt: edition.adminConfirmedAt?.toISOString() || null,
    notaryConfirmedAt: edition.notaryConfirmedAt?.toISOString() || null,
    resultsRevealed: edition.resultsRevealed,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <NotariaClient
        notaryName={session.name}
        edition={editionData}
        votingProgress={votingProgress}
        auditLogs={auditLogs}
      />
    </div>
  );
}
