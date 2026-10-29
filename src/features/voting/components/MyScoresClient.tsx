"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface EvaluatedItem {
  id: string;
  order: number;
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
    weightedTotal: number;
    payloadHash: string;
    submittedAt: string;
  };
}

interface MyScoresClientProps {
  juryName: string;
  juryCode: string;
  totalEntriesCount: number;
  evaluations: EvaluatedItem[];
}

export default function MyScoresClient({
  juryName,
  juryCode,
  totalEntriesCount,
  evaluations,
}: MyScoresClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const totalEvaluated = evaluations.length;
  const pendingCount = Math.max(0, totalEntriesCount - totalEvaluated);
  const percentCompleted =
    totalEntriesCount > 0 ? Math.round((totalEvaluated / totalEntriesCount) * 100) : 0;

  const averageScore = useMemo(() => {
    if (evaluations.length === 0) return 0;
    const sum = evaluations.reduce((acc, curr) => acc + curr.score.rawTotal, 0);
    return Math.round((sum / evaluations.length) * 10) / 10;
  }, [evaluations]);

  const filtered = useMemo(() => {
    return evaluations.filter((item) => {
      if (selectedCategory !== "all" && item.categorySlug !== selectedCategory) {
        return false;
      }
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchName = item.candidateName.toLowerCase().includes(query);
        const matchFrat = item.fraternityName.toLowerCase().includes(query);
        const matchUniv = item.university.toLowerCase().includes(query);
        if (!matchName && !matchFrat && !matchUniv) return false;
      }
      return true;
    });
  }, [evaluations, selectedCategory, searchFilter]);

  const moperitaList = filtered.filter((i) => i.categorySlug === "moperita");
  const nustaList = filtered.filter((i) => i.categorySlug === "nusta");

  return (
    <div className="flex flex-col w-full gap-space-lg pb-16">
      {/* Header & Evaluator Mission Telemetry */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary/15 border border-tertiary/40 text-tertiary font-label-sm text-label-sm font-bold uppercase tracking-wider">
              Sesión Notariada Activa • {juryCode}
            </span>
            <span className="text-on-surface-variant text-label-sm font-label-sm">• Trinidad, Beni</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
            MI CALIFICACIÓN
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Progreso de evaluación en tiempo real •{" "}
            <strong className="text-primary font-semibold">Jurado Oficial: {juryName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link
            href="/jurado"
            className="px-3.5 py-2 rounded-lg bg-surface-container-high border border-outline-variant/60 text-on-surface hover:bg-surface-container-highest font-label-md text-label-md flex items-center gap-1.5 transition-colors font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            <span>Ver Catálogo</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Glass Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Candidatas */}
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg relative overflow-hidden group hover:border-tertiary/40 transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary-container/40 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-on-surface-variant mb-1 font-label-sm text-label-sm uppercase tracking-wider">
            <span>Candidatas</span>
            <span className="material-symbols-outlined text-primary text-[20px]">group</span>
          </div>
          <div className="font-display-hero text-display-hero text-on-surface font-extrabold leading-none mt-1">
            {totalEntriesCount}
          </div>
          <div className="text-on-surface-variant font-body-sm text-body-sm mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">ballot</span>
            Total registradas
          </div>
        </div>

        {/* KPI 2: Calificadas */}
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-4 border border-tertiary/40 shadow-lg relative overflow-hidden group hover:shadow-tertiary/10 transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-tertiary/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-tertiary mb-1 font-label-sm text-label-sm uppercase tracking-wider font-bold">
            <span>Calificadas</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <div className="font-display-hero text-display-hero text-tertiary font-extrabold leading-none mt-1">
            {totalEvaluated}
          </div>
          <div className="text-primary font-body-sm text-body-sm mt-1 flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            Actas firmadas
          </div>
        </div>

        {/* KPI 3: Pendientes */}
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg relative overflow-hidden group hover:border-tertiary/40 transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-600/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-amber-400 mb-1 font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            <span>Pendientes</span>
            <span className="material-symbols-outlined text-amber-400 text-[20px]">hourglass_top</span>
          </div>
          <div className="font-display-hero text-display-hero text-amber-300 font-extrabold leading-none mt-1">
            {pendingCount}
          </div>
          <div className="text-on-surface-variant font-body-sm text-body-sm mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">pending</span>
            Por evaluar
          </div>
        </div>

        {/* KPI 4: Promedio de Voto */}
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-4 border border-secondary/30 shadow-lg relative overflow-hidden group hover:border-secondary/60 transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary-container/30 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-secondary mb-1 font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            <span>Promedio Emitido</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">grade</span>
          </div>
          <div className="font-display-hero text-display-hero text-secondary font-extrabold leading-none mt-1">
            {averageScore > 0 ? averageScore.toFixed(1) : "--"}
          </div>
          <div className="text-secondary/80 font-body-sm text-body-sm mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calculate</span>
            Sobre 40.0 pts
          </div>
        </div>
      </section>

      {/* Global Ceremonial Progress Bar */}
      <section className="bg-surface-container/80 backdrop-blur-lg rounded-xl p-5 border border-white/10 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {percentCompleted}% completado
            </span>
            <span className="text-on-surface-variant font-body-sm text-body-sm ml-2">
              ({totalEvaluated} de {totalEntriesCount} evaluaciones cerradas)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-container-highest text-tertiary border border-tertiary/30 font-label-sm text-label-sm font-semibold flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[15px]">schedule</span>
              Panel Oficial Activo
            </span>
          </div>
        </div>

        <div className="w-full h-3.5 bg-surface-container-lowest rounded-full overflow-hidden p-0.5 border border-outline-variant/40">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1"
            style={{
              width: `${percentCompleted}%`,
              background: "linear-gradient(90deg, #0088FF 0%, #00d2b4 50%, #f5bf00 100%)",
            }}
          >
            <span className="block w-2 h-2 rounded-full bg-white shadow-sm animate-pulse" />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-label-sm font-label-sm text-on-surface-variant/90">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">shield</span>
            <span>Transmisión criptográfica de actas a la Notaría de Fe Pública de Trinidad</span>
          </div>
          <span className="text-primary font-mono text-[11px] tracking-wider font-semibold">
            BLOCK_SIG: #77B8-A29F-BENI-2026
          </span>
        </div>
      </section>

      {/* Filter and Category Selection Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Todas ({evaluations.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("moperita")}
            className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "moperita"
                ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-sm">nature_people</span>
            Moperita ({evaluations.filter((e) => e.categorySlug === "moperita").length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("nusta")}
            className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "nusta"
                ? "bg-tertiary text-on-tertiary-fixed font-bold shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-sm">crown</span>
            Ñusta ({evaluations.filter((e) => e.categorySlug === "nusta").length})
          </button>
        </div>

        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar en mis actas..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-surface-container pl-9 pr-3 py-1.5 rounded-lg text-sm text-on-surface placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:border-tertiary transition-colors"
          />
        </div>
      </div>

      {/* Evaluations Columns (Moperita and Ñusta) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moperita Column */}
        {(selectedCategory === "all" || selectedCategory === "moperita") && (
          <section className="space-y-4">
            <div className="bg-surface-container rounded-xl p-3.5 border-l-4 border-tertiary border-y border-r border-white/5 flex items-center justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-tertiary font-bold tracking-tight">
                    MOPERITA DE BOLIVIA
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-tertiary/20 text-tertiary font-bold rounded">2026</span>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Amazonía, Chaco &amp; Oriente</p>
              </div>
              <span className="material-symbols-outlined text-tertiary text-[26px]">nature_people</span>
            </div>

            <div className="space-y-3">
              {moperitaList.map((item) => (
                <article
                  key={item.id}
                  className="bg-surface-container/60 hover:bg-surface-container/90 rounded-xl p-4 border border-primary/30 backdrop-blur-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.candidateName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/50 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary border-2 border-primary/50 shrink-0">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                          {item.candidateName}
                        </h3>
                        <span className="flex items-center gap-0.5 text-xs text-primary font-bold bg-primary-container px-2 py-0.5 rounded border border-primary/30 shrink-0">
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            lock
                          </span>
                          FIRMADO
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {item.danceName}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="bg-secondary-container/20 text-secondary text-[11px] font-bold px-2 py-0.5 rounded border border-secondary/40">
                          {item.university} • {item.department}
                        </span>
                        <div className="text-right">
                          <span className="font-label-numeric text-headline-sm text-tertiary font-bold leading-none">
                            {item.score.rawTotal.toFixed(1)}
                          </span>
                          <span className="text-xs text-on-surface-variant font-medium"> / 40 pts</span>
                        </div>
                      </div>

                      {/* Notarial Hash Bar */}
                      <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                        <div className="flex items-center gap-1 font-mono text-[10px] text-primary truncate max-w-[200px]">
                          <span className="material-symbols-outlined text-xs">fingerprint</span>
                          <span>{item.score.payloadHash.slice(0, 16)}...</span>
                        </div>
                        <Link
                          href={`/jurado/calificar/${item.id}`}
                          className="text-tertiary hover:underline flex items-center gap-0.5 font-semibold text-[11px]"
                        >
                          <span>Ver Acta</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {moperitaList.length === 0 && (
                <div className="p-8 text-center text-on-surface-variant bg-surface-container/30 rounded-xl border border-dashed border-outline-variant/30">
                  <p className="text-sm">Aún no has calificado candidatas de Moperita.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Ñusta Column */}
        {(selectedCategory === "all" || selectedCategory === "nusta") && (
          <section className="space-y-4">
            <div className="bg-surface-container rounded-xl p-3.5 border-l-4 border-secondary border-y border-r border-white/5 flex items-center justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-secondary font-bold tracking-tight">
                    ÑUSTA DE BOLIVIA
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-secondary-container/20 text-secondary font-bold rounded">2026</span>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Andes, Valles &amp; Altiplano</p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[26px]">crown</span>
            </div>

            <div className="space-y-3">
              {nustaList.map((item) => (
                <article
                  key={item.id}
                  className="bg-surface-container/60 hover:bg-surface-container/90 rounded-xl p-4 border border-primary/30 backdrop-blur-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.candidateName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/50 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-secondary border-2 border-primary/50 shrink-0">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                          {item.candidateName}
                        </h3>
                        <span className="flex items-center gap-0.5 text-xs text-primary font-bold bg-primary-container px-2 py-0.5 rounded border border-primary/30 shrink-0">
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            lock
                          </span>
                          FIRMADO
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {item.danceName}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="bg-secondary-container/20 text-secondary text-[11px] font-bold px-2 py-0.5 rounded border border-secondary/40">
                          {item.university} • {item.department}
                        </span>
                        <div className="text-right">
                          <span className="font-label-numeric text-headline-sm text-tertiary font-bold leading-none">
                            {item.score.rawTotal.toFixed(1)}
                          </span>
                          <span className="text-xs text-on-surface-variant font-medium"> / 40 pts</span>
                        </div>
                      </div>

                      {/* Notarial Hash Bar */}
                      <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                        <div className="flex items-center gap-1 font-mono text-[10px] text-primary truncate max-w-[200px]">
                          <span className="material-symbols-outlined text-xs">fingerprint</span>
                          <span>{item.score.payloadHash.slice(0, 16)}...</span>
                        </div>
                        <Link
                          href={`/jurado/calificar/${item.id}`}
                          className="text-tertiary hover:underline flex items-center gap-0.5 font-semibold text-[11px]"
                        >
                          <span>Ver Acta</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {nustaList.length === 0 && (
                <div className="p-8 text-center text-on-surface-variant bg-surface-container/30 rounded-xl border border-dashed border-outline-variant/30">
                  <p className="text-sm">Aún no has calificado candidatas de Ñusta.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
