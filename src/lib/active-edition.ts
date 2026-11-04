import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type EditionReader = Pick<Prisma.TransactionClient, "edition">;

export function getActiveEdition(client: EditionReader = prisma) {
  return client.edition.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { year: "desc" },
  });
}

export async function requireActiveEdition(expectedId?: string, client: EditionReader = prisma) {
  const edition = await getActiveEdition(client);
  if (!edition) throw new Error("No hay una edición activa del certamen. Activa una edición antes de registrar cambios.");
  if (expectedId && edition.id !== expectedId) {
    throw new Error("La edición activa cambió. Actualiza la página antes de guardar.");
  }
  return edition;
}
