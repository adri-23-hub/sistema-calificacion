import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DanceScoringClient, { type DanceGroupDetail } from "@/features/danza/components/DanceScoringClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function CalificarDanzaPage({ params }: PageProps) {
  const { groupId } = await params;
  const session = await getSession();

  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  const group = await prisma.danceGroup.findUnique({
    where: { id: groupId },
    include: {
      fraternity: true,
      danceScores: {
        where: {
          juryId: session.userId,
          status: "SUBMITTED",
        },
      },
    },
  });

  if (!group) {
    redirect("/jurado");
  }

  const userScore = group.danceScores[0] || null;

  const groupDetail: DanceGroupDetail = {
    id: group.id,
    entryOrder: group.entryOrder,
    danceName: group.danceName,
    fraternityName: group.fraternity.name,
    university: group.fraternity.university,
    city: group.fraternity.city,
    department: group.fraternity.department,
    numberOfDancers: group.numberOfDancers,
    status: group.status,
    isDisqualified: group.isDisqualified,
    hasCaratula: group.hasCaratula,
    hasMonografia: group.hasMonografia,
    hasDancerList: group.hasDancerList,
    hasInvitation: group.hasInvitation,
    userScore: userScore
      ? {
          coreografia: userScore.coreografia,
          vestimenta: userScore.vestimenta,
          entusiasmo: userScore.entusiasmo,
          rawTotal: userScore.rawTotal,
          observations: userScore.observations,
          submittedAt: userScore.submittedAt.toISOString(),
          payloadHash: userScore.payloadHash,
        }
      : null,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <DanceScoringClient
        juryName={session.name}
        juryCode={session.code || "JUR-01"}
        group={groupDetail}
      />
    </div>
  );
}
