import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ScoringFormClient, { type EntryDetail, type CriterionItem } from "@/features/voting/components/ScoringFormClient";

export const dynamic = "force-dynamic";

const DEFAULT_CRITERIA: CriterionItem[] = [
  {
    id: "crit-1",
    order: 1,
    name: "Porte y elegancia en la pasarela",
    description: "Postura escénica, dominio del espacio, gracia y desplazamiento rítmico.",
    maxPoints: 10.0,
    weight: 0.25,
  },
  {
    id: "crit-2",
    order: 2,
    name: "Carisma y simpatía ante el público",
    description: "Conexión con los espectadores, entusiasmo folklórico y expresión facial.",
    maxPoints: 10.0,
    weight: 0.25,
  },
  {
    id: "crit-3",
    order: 3,
    name: "Autenticidad y respeto a las tradiciones en traje típico",
    description: "Confección artesanal fidedigna, bordados tradicionales, pollerín y sombrero.",
    maxPoints: 10.0,
    weight: 0.25,
  },
  {
    id: "crit-4",
    order: 4,
    name: "Originalidad y estilo en la presentación casual",
    description: "Armonía estética, creatividad identitaria contemporánea y desenvolvimiento.",
    maxPoints: 10.0,
    weight: 0.25,
  },
];

interface PageProps {
  params: Promise<{ entryId: string }>;
}

export default async function CalificarPage({ params }: PageProps) {
  const { entryId } = await params;
  const session = await getSession();

  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  let entryDetail: EntryDetail | null = null;

  try {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        category: true,
        participant: {
          include: { fraternity: true },
        },
        scores: {
          where: {
            juryId: session.userId,
            status: "SUBMITTED",
          },
          include: { items: true },
        },
      },
    });

    if (entry) {
      // Find active rubric
      const rubric = await prisma.rubric.findFirst({
        where: {
          categoryId: entry.categoryId,
          status: "ACTIVE",
        },
        include: {
          criteria: {
            orderBy: { order: "asc" },
          },
        },
      });

      const userScore = entry.scores[0];

      entryDetail = {
        id: entry.id,
        order: entry.order,
        categoryName: entry.category.name,
        categorySlug: entry.category.slug,
        danceName: entry.participant.fraternity.name,
        fraternityName: entry.participant.fraternity.name,
        university: entry.participant.fraternity.university,
        city: entry.participant.fraternity.city,
        department: entry.participant.fraternity.department,
        candidateName: entry.participant.fullName,
        candidateTitle: `Candidata a ${entry.category.name} 2026`,
        photoUrl: entry.participant.photoUrl,
        bio: entry.participant.bio || undefined,
        rubricId: rubric?.id || "default-rubric",
        criteria: rubric?.criteria.map((c) => ({
          id: c.id,
          order: c.order,
          name: c.name,
          description: c.description || "",
          maxPoints: c.maxPoints,
          weight: c.weight,
        })) || DEFAULT_CRITERIA,
        existingScore: userScore
          ? {
              rawTotal: userScore.rawTotal || 0,
              payloadHash: userScore.payloadHash || "",
              submittedAt: userScore.submittedAt?.toISOString() || "",
              items: userScore.items.map((i) => ({
                criterionId: i.criterionId,
                points: i.points,
              })),
            }
          : null,
      };
    }
  } catch (err) {
    console.warn("Could not query DB for entry, using fallback:", err);
  }

  // Graceful fallback for mock testing
  if (!entryDetail) {
    const isMoperita = entryId.startsWith("mop");
    entryDetail = {
      id: entryId,
      order: isMoperita ? 1 : 19,
      categoryName: isMoperita ? "Moperita de Bolivia" : "Ñusta de Bolivia",
      categorySlug: isMoperita ? "moperita" : "nusta",
      danceName: isMoperita
        ? "Los Macheteros de San Ignacio de Moxos"
        : "Caporales Centralistas Universitarios",
      fraternityName: isMoperita
        ? "Fraternidad Folklórica Universitaria UAB"
        : "Fraternidad Caporales San Simón",
      university: isMoperita ? "UAB" : "UMSS",
      city: isMoperita ? "Trinidad" : "Cochabamba",
      department: isMoperita ? "Beni" : "Cochabamba",
      candidateName: isMoperita ? "Valeria Rivero Cuéllar" : "Valeria Méndez Flores",
      candidateTitle: isMoperita ? "Candidata a Moperita 2026" : "Candidata a Ñusta 2026",
      photoUrl: isMoperita
        ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBOPMlR0YCFYCxV0Q2MeWwDv1FlL0lkgxPtVxLhj19hj8gODVmgCimwIlgMWjZpzznL_Y33oXZkjEXavwIw_nCFbNY_FL-Rmd_fWc9VWiu9MYntKNP8QDKJxoFr4BRE1v5OKdmw8Bg9RY-XorYFVW1yAgRF6R4Hp83yBc5mGgSFMatXlSy4Pim_4BAYWf5uE0dBDwp8Eq9naNoffkVKLIrlQdLXqUMAokAgaSOQ2HNHnormqXmR32Cn"
        : "https://lh3.googleusercontent.com/aida-public/AB6AXuBfhovqeJ0_fpEHOT9dmZm97GhiEXTfhKnVtTQOKbxU-tnWt7rLd5XwxpXcrzw3qAeGp1rsRA95TKU_i-V71xVwEE-Pmqpxo2FlgaG2Z-XeFDz6K-jSmdpqLIbcDwahS77hgLGQumN11OVWsuITaKjjhuCotjUY2Lr2jifviaJ7JF9Og5LGC_IFjBx49_aPZAQ0Q_FKiCd0h6nnmUY-LPpmKObUGHfskpV7Vcyn3jybQvYeFk4QpUew",
      bio: isMoperita
        ? "Danza ancestral moxeña con plumajes radiales de paraba barba azul, túnica camba y machetes de madera en honor a la festividad de la Santísima Trinidad."
        : "Reinterpretación del caporal cochabambino con vestimenta en tonos azul cobalto y oro puro, integrando bordados en hilo de plata con alegorías a la fauna boliviana.",
      rubricId: "rubric-default",
      criteria: DEFAULT_CRITERIA,
      existingScore: null,
    };
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ScoringFormClient
        entry={entryDetail}
        juryName={session.name}
        juryCode={session.code || "JUR-04"}
      />
    </div>
  );
}
