import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ControlPortalClient, { type DanceGroupControlItem } from "@/features/control/ControlPortalClient";

export const dynamic = "force-dynamic";

export default async function ControlPage() {
  const session = await getSession();

  if (!session || (session.role !== "CONTROL" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  let groups: DanceGroupControlItem[] = [];

  try {
    const dbGroups = await prisma.danceGroup.findMany({
      include: {
        fraternity: true,
        penalties: {
          orderBy: { registeredAt: "asc" },
        },
      },
      orderBy: [
        { entryOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    groups = dbGroups.map((g) => ({
      id: g.id,
      entryOrder: g.entryOrder,
      danceName: g.danceName,
      fraternityName: g.fraternity.name,
      university: g.fraternity.university,
      department: g.fraternity.department,
      numberOfDancers: g.numberOfDancers,
      status: g.status,
      arrivalTime: g.arrivalTime?.toISOString() || null,
      arrivalRegisteredBy: g.arrivalRegisteredBy,
      isDisqualified: g.isDisqualified,
      disqualifyReason: g.disqualifyReason,
      hasCaratula: g.hasCaratula,
      hasMonografia: g.hasMonografia,
      hasDancerList: g.hasDancerList,
      hasInvitation: g.hasInvitation,
      penalties: g.penalties.map((p) => ({
        id: p.id,
        type: p.type,
        points: p.points,
        observation: p.observation,
        registeredAt: p.registeredAt.toISOString(),
        registeredBy: p.registeredBy,
        isVoided: p.isVoided,
      })),
    }));
  } catch (error) {
    console.error("Error loading control data:", error);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ControlPortalClient
        userName={session.name}
        userCode={session.code || "CTRL-01"}
        groups={groups}
      />
    </div>
  );
}
