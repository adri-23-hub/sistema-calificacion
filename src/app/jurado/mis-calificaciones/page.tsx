import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MyScoresClient, { type EvaluatedItem } from "@/features/voting/components/MyScoresClient";

export const dynamic = "force-dynamic";

const FALLBACK_EVALUATIONS: EvaluatedItem[] = [
  {
    id: "mop-01",
    order: 1,
    categoryName: "Moperita de Bolivia",
    categorySlug: "moperita",
    danceName: "Los Macheteros de San Ignacio de Moxos",
    fraternityName: "Fraternidad Folklórica Universitaria UAB • Sede Central Trinidad",
    university: "UAB",
    city: "Trinidad",
    department: "Beni",
    candidateName: "Valeria Rivero Cuéllar",
    candidateTitle: "Candidata a Moperita 2026",
    photoUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBOPMlR0YCFYCxV0Q2MeWwDv1FlL0lkgxPtVxLhj19hj8gODVmgCimwIlgMWjZpzznL_Y33oXZkjEXavwIw_nCFbNY_FL-Rmd_fWc9VWiu9MYntKNP8QDKJxoFr4BRE1v5OKdmw8Bg9RY-XorYFVW1yAgRF6R4Hp83yBc5mGgSFMatXlSy4Pim_4BAYWf5uE0dBDwp8Eq9naNoffkVKLIrlQdLXqUMAokAgaSOQ2HNHnormqXmR32Cn",
    score: {
      rawTotal: 38.5,
      weightedTotal: 9.62,
      payloadHash: "0x8f9ca44a2b1e7c9f8d3e2a1b0c4f5e6d7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      submittedAt: new Date().toISOString(),
    },
  },
  {
    id: "mop-02",
    order: 2,
    categoryName: "Moperita de Bolivia",
    categorySlug: "moperita",
    danceName: "Taquirari y Chovena Chiquitana",
    fraternityName: "Ballet Folklórico Universitario UAGRM • Santa Cruz",
    university: "UAGRM",
    city: "Santa Cruz",
    department: "Santa Cruz",
    candidateName: "Luciana Aguilera Paz",
    candidateTitle: "Candidata a Moperita 2026",
    photoUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA1YPKcnEFNguSLmmIHimTunbF6dZa60k9BxxW8qCwhW5s6GeBfH5LvZAVLMqMijJTJDxUT2Bj6N9909WQXPusaOtsfdDNDNEXdv0oMubVkXvQVrR3uiPTSUFMhNM1ac3j9w8Sl1smVKk95XAW84IuyCPem3vZhTWdE2HodRFOoeONQhd1L8zrfT3jvbxjWUD9PdT4pTGESGoB67OqEDNsGrfeixbEp5mVfTAxssaHZDOcTNjG6gvHz",
    score: {
      rawTotal: 37.0,
      weightedTotal: 9.25,
      payloadHash: "0x4b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
      submittedAt: new Date().toISOString(),
    },
  },
];

export default async function MisCalificacionesPage() {
  const session = await getSession();
  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  let evaluations: EvaluatedItem[] = [];
  let totalEntriesCount = 36;

  try {
    const scores = await prisma.score.findMany({
      where: {
        juryId: session.userId,
        status: "SUBMITTED",
      },
      include: {
        entry: {
          include: {
            category: true,
            participant: {
              include: { fraternity: true },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const count = await prisma.entry.count();
    if (count > 0) totalEntriesCount = count;

    if (scores && scores.length > 0) {
      evaluations = scores.map((s) => ({
        id: s.entry.id,
        order: s.entry.order,
        categoryName: s.entry.category.name,
        categorySlug: s.entry.category.slug,
        danceName: s.entry.participant.fraternity.name,
        fraternityName: s.entry.participant.fraternity.name,
        university: s.entry.participant.fraternity.university,
        city: s.entry.participant.fraternity.city,
        department: s.entry.participant.fraternity.department,
        candidateName: s.entry.participant.fullName,
        candidateTitle: `Candidata a ${s.entry.category.name} 2026`,
        photoUrl: s.entry.participant.photoUrl,
        score: {
          rawTotal: s.rawTotal || 0,
          weightedTotal: s.weightedTotal || 0,
          payloadHash: s.payloadHash || "",
          submittedAt: s.submittedAt?.toISOString() || new Date().toISOString(),
        },
      }));
    } else {
      evaluations = FALLBACK_EVALUATIONS;
    }
  } catch (error) {
    console.warn("Could not query DB for scores, using fallback:", error);
    evaluations = FALLBACK_EVALUATIONS;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <MyScoresClient
        juryName={session.name}
        juryCode={session.code || "JUR-04"}
        totalEntriesCount={totalEntriesCount}
        evaluations={evaluations}
      />
    </div>
  );
}
