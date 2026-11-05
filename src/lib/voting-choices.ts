import { prisma } from "@/lib/db";
import { getActiveEdition } from "@/lib/active-edition";

export interface ContestChoice { id: string; name: string; icon: string; enabled: boolean; }
export interface VotingChoice { id: string; name: string; description: string; href: string; voted: boolean; }
export async function getVotingChoices(userId: string, requested?: string) {
  const edition = await getActiveEdition();
  if (!edition) return { contests: [] as ContestChoice[], entries: [] as VotingChoice[], selected: null, message: "No hay una edición activa." };
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
  if (selected?.id === "danzas") {
    const groups = await prisma.danceGroup.findMany({ where: { editionId: edition.id, status: "IN_SCORING", isDisqualified: false }, include: { fraternity: true, danceScores: { where: { juryId: userId, status: "SUBMITTED" } } }, orderBy: { entryOrder: "asc" } });
    entries.push(...groups.map(g => ({ id: g.id, name: g.danceName, description: `${g.fraternity.name} · ${g.fraternity.university}`, href: `/jurado/danza/${g.id}`, voted: g.danceScores.length > 0 })));
  } else if (selected) {
    const now = new Date();
    const candidates = await prisma.entry.findMany({ where: {
      categoryId: selected.id, status: "IN_SCORING", participant: { isActive: true },
      category: { editionId: edition.id, status: { in: ["OPEN", "VOTING"] }, activeRubricId: { not: null } },
      AND: [{ OR: [{ votingOpensAt: null }, { votingOpensAt: { lte: now } }] }, { OR: [{ votingClosesAt: null }, { votingClosesAt: { gt: now } }] }],
    }, include: { participant: { include: { fraternity: true } }, runway: true, scores: { where: { juryId: userId, status: "SUBMITTED" } } }, orderBy: [{ order: "asc" }, { runway: { order: "asc" } }] });
    entries.push(...candidates.map(e => ({ id: e.id, name: e.participant.fullName, description: `${e.runway?.name ?? "Participación"} · ${e.participant.fraternity.name}`, href: `/jurado/calificar/${e.id}`, voted: e.scores.length > 0 })));
  }
  return { contests, entries, selected, message: !assignment?.isActive ? "No tienes una asignación activa. Consulta al administrador." : requested && !selected ? "Ese certamen no está disponible para tu asignación." : null };
}
