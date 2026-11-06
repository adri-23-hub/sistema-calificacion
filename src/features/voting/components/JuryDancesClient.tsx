"use client";
import DanceVotingCard from "./DanceVotingCard";

import CandidateVotingCards from "./CandidateVotingCards";
import type { CandidateChoice } from "@/lib/voting-choices";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface DanceItem {
  candidate?: CandidateChoice;
  id: string;
  order: number;
  status: "PENDING" | "ACTIVE" | "CLOSED";
  categoryName: string;
  categorySlug: string;
  danceName: string;
  fraternityName: string;
  university: string;
  city: string;
  department: string;
  candidateName: string;
  candidateTitle: string;
  photoUrl: string | null;
  score: {
    rawTotal: number;
    payloadHash: string;
    submittedAt: string;
  } | null;
}

function isComplete(item: DanceItem) {
  return item.candidate ? item.candidate.rounds.every(r => r.status === "voted") : item.score !== null;
}

interface JuryDancesClientProps {
  juryName: string;
  juryCode: string;
  dances: DanceItem[];
}

export default function JuryDancesClient({
  juryName,
  juryCode,
  dances,
}: JuryDancesClientProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "rated">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Stats calculation
  const totalCount = dances.length;
  const ratedCount = dances.filter((d) => isComplete(d)).length;
  const pendingCount = totalCount - ratedCount;
  const progressPercent = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0;

  // Active / on-stage dance (first active or first pending)
  const currentActiveDance = useMemo(() => {
    return dances.find((d) => d.status === "ACTIVE" && !isComplete(d)) ||
      dances.find((d) => !isComplete(d)) ||
      dances[0];
  }, [dances]);

  // Filtered dances
  const filteredDances = useMemo(() => {
    return dances.filter((d) => {
      // Category filter
      if (categoryFilter !== "all" && d.categorySlug !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === "pending" && isComplete(d)) return false;
      if (statusFilter === "rated" && !isComplete(d)) return false;
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesFraternity = d.fraternityName.toLowerCase().includes(query);
        const matchesDance = d.danceName.toLowerCase().includes(query);
        const matchesCandidate = d.candidateName.toLowerCase().includes(query);
        const matchesUniv = d.university.toLowerCase().includes(query);
        if (!matchesFraternity && !matchesDance && !matchesCandidate && !matchesUniv) {
          return false;
        }
      }
      return true;
    });
  }, [dances, categoryFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col w-full gap-space-lg pb-16">
      {/* Background ambient accents */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-0 w-80 h-80 rounded-full bg-tertiary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-space-lg">
          {/* Welcome & Jury Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low/90 backdrop-blur-xl p-space-md lg:p-space-lg rounded-xl shadow-md border border-outline-variant/30">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tertiary via-tertiary-fixed-dim to-secondary-container flex items-center justify-center p-0.5 shadow-md">
                  <div className="w-full h-full bg-surface-container-lowest rounded-[10px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      badge
                    </span>
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-surface-container-lowest text-[10px] font-bold">check</span>
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-label-sm text-label-sm tracking-wider uppercase text-tertiary bg-tertiary-container px-2.5 py-0.5 rounded-full font-bold">
                    Jurado Asignado • {juryCode}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Terminal Tablet Oficial
                  </span>
                </div>
                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight truncate mt-0.5 font-bold">
                  Bienvenido, {juryName}
                </h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Mesa de Evaluación Oficial • Folklore, Coreografía &amp; Tradición Nacional
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-md bg-surface-container-high/60 px-space-md py-space-sm rounded-xl border border-outline-variant/30">
              <div className="flex flex-col text-right">
                <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Ronda Clasificatoria</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">Bloque Oficial I • Trinidad 2026</span>
              </div>
              <div className="h-8 w-px bg-surface-container-highest"></div>
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="material-symbols-outlined text-body-md animate-spin" style={{ animationDuration: "4s" }}>sync</span>
                <span className="font-label-sm text-label-sm uppercase font-semibold">En Vivo</span>
              </div>
            </div>
          </div>

          {/* Telemetry Progress & Stage Spotlight Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
            {/* Progress Card */}
            <div className="xl:col-span-8 bg-surface-container-low/80 backdrop-blur-md p-space-md lg:p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between gap-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-tertiary text-headline-sm">monitoring</span>
                  <div>
                    <h2 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wide font-bold">Avance de Evaluación</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Progreso de actas electrónicas firmadas digitalmente</p>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs self-start sm:self-auto bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/30">
                  <span className="font-label-numeric text-headline-sm text-tertiary font-bold">{progressPercent}%</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Completado</span>
                </div>
              </div>

              <div className="flex flex-col gap-space-xs">
                <div className="w-full h-3.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-tertiary to-secondary-container transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant px-1">
                  <span>0 Calificadas</span>
                  <span className="text-on-surface font-semibold">{ratedCount} Evaluadas</span>
                  <span>Total: {totalCount} Danzas</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
                <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Registradas</span>
                  <span className="font-label-numeric text-headline-md text-on-surface font-bold">{totalCount}</span>
                </div>
                <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col border border-primary/30">
                  <span className="font-label-sm text-label-sm uppercase text-primary font-bold">Evaluadas</span>
                  <div className="flex items-center gap-1">
                    <span className="font-label-numeric text-headline-md text-primary font-bold">{ratedCount}</span>
                    <span className="material-symbols-outlined text-primary text-body-sm">check_circle</span>
                  </div>
                </div>
                <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col border border-tertiary/30">
                  <span className="font-label-sm text-label-sm uppercase text-tertiary font-bold">Pendientes</span>
                  <div className="flex items-center gap-1">
                    <span className="font-label-numeric text-headline-md text-tertiary font-bold">{pendingCount}</span>
                    <span className="material-symbols-outlined text-tertiary text-body-sm animate-pulse">hourglass_top</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Spotlight Card */}
            {currentActiveDance && (
              <div className="xl:col-span-4 bg-gradient-to-br from-surface-container via-surface-container-low to-primary-container/40 p-space-md lg:p-space-lg rounded-xl shadow-sm border border-secondary/30 flex flex-col justify-between gap-space-md relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm uppercase text-secondary font-bold tracking-widest flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-ping" /> Cabina de Escenario
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Trinidad • Palco</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight font-bold">
                    Turno #{String(currentActiveDance.order).padStart(2, "0")} • {currentActiveDance.danceName}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                    {currentActiveDance.fraternityName} ({currentActiveDance.university}) ante la tribuna universitaria.
                  </p>
                </div>

                <div className="bg-surface-container-lowest/80 p-space-sm rounded-lg flex flex-wrap gap-3 items-center justify-between border border-outline-variant/30">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-tertiary text-headline-md">timer</span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Tiempo en Escenario</span>
                      <span className="font-label-md text-label-md text-on-surface font-mono font-bold">06:42 / 10:00</span>
                    </div>
                  </div>
                  <Link
                    href={
                      currentActiveDance.categorySlug === "entrada-folklorica"
                        ? `/jurado/danza/${currentActiveDance.id}`
                        : (currentActiveDance.candidate?.rounds.find(r => r.status === "open")?.href ?? "/jurado/calificar")
                    }
                    className="px-space-md py-space-xs bg-tertiary text-on-tertiary-fixed font-label-sm text-label-sm uppercase rounded-md font-bold hover:brightness-110 transition-transform active:scale-95 shadow-sm inline-flex items-center gap-1"
                  >
                    <span>Ir al Voto</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-space-sm bg-surface-container-low/70 p-space-md rounded-xl border border-outline-variant/20">
            {/* Category selection tabs */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-outline-variant/20 pb-space-sm">
              <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="font-label-sm text-label-sm uppercase text-on-surface-variant font-bold mr-1">Categoría:</span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all ${
                    categoryFilter === "all"
                      ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Todas ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("entrada-folklorica")}
                  className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    categoryFilter === "entrada-folklorica"
                      ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">groups</span>
                  Entrada Folklórica (Danzas)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("moperita")}
                  className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    categoryFilter === "moperita"
                      ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">nature_people</span>
                  Moperita de Bolivia
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("nusta")}
                  className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    categoryFilter === "nusta"
                      ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">crown</span>
                  Ñusta de Bolivia
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar danza, fraternidad, candidata..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container pl-9 pr-3 py-1.5 rounded-lg text-sm text-on-surface placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:border-tertiary transition-colors"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 pt-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-space-md py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  statusFilter === "all"
                    ? "bg-primary-container text-on-surface font-semibold shadow-sm border border-primary/40"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-body-md">view_agenda</span>
                Todas las danzas ({filteredDances.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-space-md py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  statusFilter === "pending"
                    ? "bg-primary-container text-on-surface font-semibold shadow-sm border border-primary/40"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-tertiary text-body-md">pending_actions</span>
                Pendientes de calificar ({dances.filter((d) => !isComplete(d)).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("rated")}
                className={`px-space-md py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  statusFilter === "rated"
                    ? "bg-primary-container text-on-surface font-semibold shadow-sm border border-primary/40"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-primary text-body-md">task_alt</span>
                Ya calificadas ({ratedCount})
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDances.map((dance) => {
              if (dance.candidate) return <CandidateVotingCards key={dance.id} candidates={[dance.candidate]} singleColumn />;
              return <DanceVotingCard key={dance.id} dance={dance} />;
            })}
          </div>

          {filteredDances.length === 0 && (
            <div className="bg-surface-container-low p-12 rounded-xl text-center flex flex-col items-center justify-center border border-outline-variant/20">
              <span className="material-symbols-outlined text-5xl text-outline mb-2">search_off</span>
              <p className="font-headline-sm text-on-surface font-bold">No se encontraron danzas</p>
              <p className="font-body-sm text-on-surface-variant mt-1">{dances.length === 0 ? "Todavía no hay danzas ni candidatas registradas en la edición activa." : "Prueba cambiando los filtros o la búsqueda."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
