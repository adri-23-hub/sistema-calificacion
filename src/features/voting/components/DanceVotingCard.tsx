import type { CandidateChoice } from "@/lib/voting-choices";
import Image from "next/image";
import Link from "next/link";
import type { DanceItem } from "./JuryDancesClient";

export default function DanceVotingCard({ dance, candidate }: { dance: DanceItem; candidate?: CandidateChoice }) {
  const completed = candidate?.rounds.filter(r => r.status === "voted").length ?? 0;
  const isRated = candidate ? completed === 3 : dance.score !== null;
  const canVote = candidate ? candidate.rounds.some(r => r.status === "open") : true;
  return (
                <div
                  key={dance.id}
                  className={`rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all duration-300 border ${
                    isRated
                      ? "bg-surface-container-low/95 border-outline-variant/40"
                      : "bg-surface-container-high/95 border-tertiary/40 hover:-translate-y-1.5 hover:shadow-2xl hover:border-tertiary/70"
                  }`}
                >
                  {/* Card Cover Header */}
                  <div className="relative w-full h-56 bg-surface-container-highest overflow-hidden">
                    {dance.photoUrl ? (
                      <Image fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" unoptimized
                        src={dance.photoUrl}
                        alt={dance.danceName}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest flex items-center justify-center">
                        <span className="material-symbols-outlined text-[64px] text-tertiary/30">theater_comedy</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-black/20 to-black/50"></div>

                    {/* Turn Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <span className="bg-surface-container-lowest/90 backdrop-blur-md text-tertiary font-display text-xl px-3 py-1 rounded-lg font-bold shadow-md border border-tertiary/20">
                        #{String(dance.order).padStart(2, "0")}
                      </span>
                      <span className="bg-surface-container-high/90 backdrop-blur-md text-on-surface text-xs px-2.5 py-1 rounded-md uppercase font-semibold border border-white/10">
                        Turno Oficial
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      {isRated ? (
                        <span className="bg-primary/95 text-on-primary text-xs px-3 py-1.5 rounded-full uppercase font-bold flex items-center gap-1.5 shadow-md">
                          <span className="material-symbols-outlined text-[15px]">lock</span> YA CALIFICADA
                        </span>
                      ) : (
                        <span className="bg-tertiary text-on-tertiary-fixed text-xs px-3.5 py-1.5 rounded-full uppercase font-bold flex items-center gap-1.5 shadow-md animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-on-tertiary-fixed" /> {canVote ? "Evaluar Ahora" : "Pendiente"}
                        </span>
                      )}
                    </div>

                    {/* Category & University pill */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
                      <span className="bg-primary-container/90 backdrop-blur-md text-primary-fixed text-xs px-2.5 py-1 rounded-md uppercase tracking-wider font-semibold border border-primary/20">
                        {dance.categoryName} • {dance.department || dance.city}
                      </span>
                      <span className="bg-surface-container-lowest/90 backdrop-blur-md text-secondary-fixed text-xs px-2.5 py-1 rounded-md font-bold border border-white/10">
                        {dance.university}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 flex flex-col gap-4 flex-1 justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase text-on-surface-variant tracking-wider font-semibold">
                          {[dance.department, dance.city].filter(Boolean).join(" • ")}
                        </span>
                        {isRated && (
                          <span className="text-xs text-primary flex items-center gap-1 font-bold">
                            <span className="material-symbols-outlined text-sm">verified_user</span> Firmado
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg text-on-surface font-bold leading-snug line-clamp-2">
                        {dance.danceName}
                      </h3>
                      <p className="text-xs text-on-surface-variant line-clamp-1">
                        {dance.fraternityName}
                      </p>
                    </div>

                    {/* Candidate Section */}
                    <div className="bg-surface-container p-3 rounded-xl flex items-center justify-between border border-outline-variant/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary shrink-0 border border-tertiary/20">
                          <span className="material-symbols-outlined text-lg">crown</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                            {dance.candidateTitle}
                          </span>
                          <span className="font-display text-sm text-on-surface truncate font-bold">
                            {dance.candidateName}
                          </span>
                        </div>
                      </div>

                      {candidate && <div className="flex flex-col items-end shrink-0 pl-2"><span className="text-[10px] uppercase text-on-surface-variant font-semibold">Pasadas calificadas</span><span className="font-display text-xl text-tertiary font-bold leading-none">{completed} <span className="text-xs text-on-surface-variant font-normal">/ 3</span></span></div>}
                      {isRated && dance.score && (
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-[10px] uppercase text-on-surface-variant font-semibold">
                            Puntaje Enviado
                          </span>
                          <span className="font-display text-xl text-tertiary font-bold leading-none">
                            {dance.score.rawTotal.toFixed(1)} <span className="text-xs text-on-surface-variant font-normal">/ 40</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-1">
                      {candidate ? <details className="group">
                        <summary className="list-none w-full min-h-[52px] bg-gradient-to-r from-tertiary via-tertiary-fixed-dim to-tertiary text-on-tertiary-fixed text-xs uppercase tracking-wider rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer focus-visible:outline-2 focus-visible:outline-tertiary [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className="material-symbols-outlined text-base">{isRated ? "verified" : "star"}</span>{isRated ? "Ver pasadas calificadas" : "Elegir pasada para calificar"}<span aria-hidden="true" className="material-symbols-outlined text-base group-open:rotate-180">expand_more</span></summary>
                        <ul className="mt-3 space-y-2">{candidate.rounds.map(round => <li key={round.type} className="flex items-center justify-between gap-2 rounded-xl bg-surface-container p-3 border border-outline-variant/30">
                          <span className="font-bold text-xs">{round.name}</span>
                          {round.status === "open" && round.href ? (
                            <Link href={round.href} aria-label={"Calificar " + round.name + " de " + candidate.name} className="text-xs font-bold text-on-tertiary-fixed bg-tertiary rounded-lg px-3 py-2">Calificar →</Link>
                          ) : round.status === "voted" && round.actaHref ? (
                            <Link href={round.actaHref} aria-label={"Ver acta de " + round.name + " de " + candidate.name} className="text-xs font-bold text-tertiary bg-tertiary/10 border border-tertiary/40 rounded-lg px-3 py-2">Ver acta →</Link>
                          ) : (
                            <span className="text-xs text-on-surface-variant">{round.status === "voted" ? "✓ Ya calificada" : round.status === "closed" ? "Votación cerrada" : "Aún no abierta"}</span>
                          )}
                        </li>)}</ul>
                      </details> : (() => {
                        const targetHref =
                          dance.categorySlug === "entrada-folklorica"
                            ? `/jurado/danza/${dance.id}`
                            : `/jurado/calificar/${dance.id}`;
                        return isRated ? (
                          <Link
                            href={targetHref}
                            className="w-full min-h-[50px] bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-xl text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-colors border border-outline-variant/30 font-semibold"
                          >
                            <span className="material-symbols-outlined text-base">verified</span>
                            <span>Ver Acta Registrada</span>
                            <span className="material-symbols-outlined text-xs ml-1">open_in_new</span>
                          </Link>
                        ) : (
                          <Link
                            href={targetHref}
                            className="w-full min-h-[52px] bg-gradient-to-r from-tertiary via-tertiary-fixed-dim to-tertiary text-on-tertiary-fixed text-xs uppercase tracking-wider rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-transform shadow-lg cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span>Calificar Danza Ahora</span>
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                          </Link>
                        );
                      })()}
                    </div>
                  </div>
                </div>
  );
}
