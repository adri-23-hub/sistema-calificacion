import type { DanceItem } from "@/features/voting/components/JuryDancesClient";
import { prisma } from "@/lib/db";
import { getActiveEdition } from "@/lib/active-edition";

export interface ContestChoice { id: string; name: string; icon: string; enabled: boolean; }
export interface VotingChoice { card: DanceItem; id: string; name: string; description: string; href: string; voted: boolean; }
export interface CandidateChoice { order?: number; categoryName?: string; university?: string; location?: string; id: string; name: string; photoUrl: string | null; fraternity: string; rounds: { type: string; name: string; status: "voted" | "open" | "closed" | "pending"; href?: string; actaHref?: string }[]; }
export async function getVotingChoices(userId: string, requested?: string) {
  const edition = await getActiveEdition();
  if (!edition) return { contests: [] as ContestChoice[], entries: [] as VotingChoice[], candidates: [] as CandidateChoice[], selected: null, message: "No hay una edición activa." };
  const [assignment, categories] = await Promise.all([
    prisma.juryAssignment.findUnique({ where: { editionId_userId: { editionId: edition.id, userId } } }),
    prisma.category.findMany({ where: { editionId: edition.id, moduleType: "MOPERITA_NUSTA" }, orderBy: { order: "asc" } }),
  ]);
  const allows = (module: "ENTRADA_FOLKLORICA" | "MOPERITA_NUSTA") => Boolean(assignment?.isActive && (!assignment.assignedModule || assignment.assignedModule === module));
  const contests: ContestChoice[] = [
    { id: "danzas", name: "Entrada Folklórica", icon: "diversity_2", enabled: allows("ENTRADA_FOLKLORICA") },
    ...categories.map(c => ({ id: c.id, name: c.name, icon: c.slug.includes("moperita") ? "local_florist" : "diamond", enabled: allows("MOPERITA_NUSTA") })),
  ];
  const selected = contests.find(c => c.id === requested && c.enabled) ?? null;
  const entries: VotingChoice[] = [];
  const cards = new Map<string, CandidateChoice>();
  if (selected?.id === "danzas") {
    const groups = await prisma.danceGroup.findMany({ where: { editionId: edition.id, status: "IN_SCORING", isDisqualified: false }, include: { fraternity: true, danceScores: { where: { juryId: userId, status: "SUBMITTED" } } }, orderBy: { entryOrder: "asc" } });
    entries.push(...groups.map(g => ({ id: g.id, name: g.danceName, description: `${g.fraternity.name} · ${g.fraternity.university}`, href: `/jurado/danza/${g.id}`, voted: g.danceScores.length > 0, card: {
 id: g.id, order: g.entryOrder ?? 99, status: "ACTIVE" as const, categoryName: "Entrada Folklórica", categorySlug: "entrada-folklorica", danceName: g.danceName, fraternityName: g.fraternity.name, university: g.fraternity.university, city: g.fraternity.city, department: g.fraternity.department, candidateName: "Fraternidad Oficial (" + g.numberOfDancers + " bailarines)", candidateTitle: "Módulo A • Grupo de Danza", photoUrl: g.photoUrl, score: g.danceScores[0] ? { rawTotal: g.danceScores[0].rawTotal, payloadHash: g.danceScores[0].payloadHash ?? "", submittedAt: g.danceScores[0].submittedAt.toISOString() } : null
 } })));
  } else if (selected) {
    const now = new Date();
    const candidates = await prisma.entry.findMany({ where: {
      categoryId: selected.id, participant: { isActive: true }, category: { editionId: edition.id },
    }, include: { participant: { include: { fraternity: true } }, category: true, runway: true, scores: { where: { juryId: userId, status: "SUBMITTED" } } }, orderBy: [{ order: "asc" }, { runway: { order: "asc" } }] });
    for (const e of candidates) {
      let card = cards.get(e.participantId);
      if (!card) {
        card = { order: e.order, categoryName: e.category.name, university: e.participant.fraternity.university, location: [e.participant.fraternity.department, e.participant.fraternity.city].filter(Boolean).join(" • "), id: e.participantId, name: e.participant.fullName, photoUrl: e.participant.photoUrl, fraternity: e.participant.fraternity.name,
          rounds: [{ type: "GALA", name: "Gala", status: "pending" }, { type: "CASUAL", name: "Casual", status: "pending" }, { type: "TIPICA", name: "Típica", status: "pending" }] };
        cards.set(e.participantId, card);
      }
      const round = card.rounds.find(r => r.type === e.runway?.type);
      if (!round) continue;
      const closed = e.status === "CLOSED" || e.category.status === "CLOSED" || Boolean(e.votingClosesAt && now >= e.votingClosesAt);
      const open = !closed && e.status === "IN_SCORING" && ["OPEN", "VOTING"].includes(e.category.status) && Boolean(e.category.activeRubricId) && (!e.votingOpensAt || now >= e.votingOpensAt);
      round.status = e.scores.length > 0 ? "voted" : closed ? "closed" : open ? "open" : "pending";
      if (round.status === "open") round.href = "/jurado/calificar/" + e.id;
      if (round.status === "voted") round.actaHref = "/jurado/calificar/" + e.id;
    }
  }
  return { contests, entries, candidates: [...cards.values()], selected, message: !assignment?.isActive ? "No tienes una asignación activa. Consulta al administrador." : requested && !selected ? "Ese certamen no está disponible para tu asignación." : null };
}
