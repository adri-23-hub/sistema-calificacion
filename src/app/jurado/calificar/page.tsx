import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CalificarIndexPage() {
  const session = await getSession();
  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  try {
    // 1. Buscar danza o candidata actualmente en escenario / activa
    const activeEntry = await prisma.entry.findFirst({
      where: {
        status: "IN_SCORING",
      },
      orderBy: { order: "asc" },
    });

    if (activeEntry) {
      redirect(`/jurado/calificar/${activeEntry.id}`);
    }

    // 2. Si no hay activa, buscar la siguiente pendiente que el jurado aún no calificó
    const pendingEntries = await prisma.entry.findMany({
      where: {
        status: { in: ["PENDING", "IN_SCORING"] },
      },
      include: {
        scores: {
          where: {
            juryId: session.userId,
            status: "SUBMITTED",
          },
        },
      },
      orderBy: { order: "asc" },
    });

    const unrated = pendingEntries.find((e) => e.scores.length === 0) || pendingEntries[0];
    if (unrated) {
      redirect(`/jurado/calificar/${unrated.id}`);
    }

    // 3. Fallback: primera danza cualquiera
    const firstEntry = await prisma.entry.findFirst({
      orderBy: { order: "asc" },
    });
    if (firstEntry) {
      redirect(`/jurado/calificar/${firstEntry.id}`);
    }
  } catch (error) {
    console.warn("DB query failed in /jurado/calificar, redirecting to mop-03:", error);
  }

  // Fallback a la danza activa por defecto del seed (mop-03)
  redirect("/jurado/calificar/mop-03");
}
