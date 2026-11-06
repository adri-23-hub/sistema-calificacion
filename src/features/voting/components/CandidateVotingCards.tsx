import DanceVotingCard from "./DanceVotingCard";
import type { CandidateChoice } from "@/lib/voting-choices";

export default function CandidateVotingCards({ candidates, singleColumn = false }: { candidates: CandidateChoice[]; singleColumn?: boolean }) {
  if (!candidates.length) return <p className="p-8 text-center text-on-surface-variant">No hay candidatas registradas en este certamen.</p>;
  return <ul className={singleColumn ? "grid gap-5" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"}>{candidates.map(candidate => <li key={candidate.id} className="grid">
    <DanceVotingCard candidate={candidate} dance={{
      id: candidate.id, order: candidate.order ?? 0,
      status: candidate.rounds.some(r => r.status === "open") ? "ACTIVE" : "PENDING",
      categoryName: candidate.categoryName ?? "Certamen", categorySlug: "candidatas",
      danceName: candidate.name, fraternityName: candidate.fraternity,
      university: candidate.university ?? "", department: candidate.location ?? "", city: "",
      candidateName: "Candidata a " + (candidate.categoryName ?? "Moperita"), candidateTitle: "Módulo B • Certamen",
      photoUrl: candidate.photoUrl, score: null,
    }} />
  </li>)}</ul>;
}
