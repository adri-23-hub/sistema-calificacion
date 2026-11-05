import type { Prisma, ModuleType } from "@prisma/client";
export async function requireJuryAssignment(tx: Prisma.TransactionClient, userId: string, editionId: string, module: ModuleType) {
  const assignment = await tx.juryAssignment.findUnique({ where: { editionId_userId: { editionId, userId } }, include: { edition: true, user: true } });
  if (!assignment?.isActive || assignment.edition.status !== "ACTIVE" || !assignment.user.isActive || assignment.user.role !== "JURADO" || (assignment.assignedModule && assignment.assignedModule !== module)) throw new Error("No tienes una asignación activa para este concurso.");
}
export async function lockEdition(tx: Prisma.TransactionClient, editionId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Edition" WHERE "id" = ${editionId} FOR UPDATE`;
}
