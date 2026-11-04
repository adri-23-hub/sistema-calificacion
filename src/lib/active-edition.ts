import { prisma } from "@/lib/db";

export function getActiveEdition() {
  return prisma.edition.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { year: "desc" },
  });
}

export async function requireActiveEdition(expectedId?: string) {
  const edition = await getActiveEdition();
  if (!edition) throw new Error("No hay una edición activa del certamen. Activa una edición antes de registrar cambios.");
  if (expectedId && edition.id !== expectedId) {
    throw new Error("La edición activa cambió. Actualiza la página antes de guardar.");
  }
  return edition;
}
