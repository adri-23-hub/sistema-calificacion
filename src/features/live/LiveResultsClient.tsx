"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveResults } from "@/features/live/useLiveResults";
import type {
  LiveCandidateItem,
  LiveDanceItem,
  LiveResultsPayload,
} from "@/features/live/types";

interface LiveResultsClientProps {
  initialData: LiveResultsPayload;
}

type ActiveModule = "A" | "B";

function pickInitialModule(data: LiveResultsPayload): ActiveModule {
  const lastA = data.moduleA.summary.lastVoteAt
    ? new Date(data.moduleA.summary.lastVoteAt).getTime()
    : 0;
  const lastB = data.moduleB.summary.lastVoteAt
    ? new Date(data.moduleB.summary.lastVoteAt).getTime()
    : 0;

  if (lastB > lastA) return "B";
  if (lastA > lastB) return "A";
  return data.moduleA.items.length > 0 ? "A" : "B";
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/La_Paz",
  });
}

function rankLabel(rank: number | null): string {
  if (rank === 1) return "🥇 1.º";
  if (rank === 2) return "🥈 2.º";
  if (rank === 3) return "🥉 3.º";
  if (rank) return `${rank}.º`;
  return "—";
}

function statusLabel(status: LiveDanceItem["status"]): string {
  if (status === "IN_SCORING") return "En calificación";
  if (status === "CLOSED") return "Cerrada";
  if (status === "DISQUALIFIED") return "Descalificado";
  return "Pendiente";
}

export default function LiveResultsClient({ initialData }: LiveResultsClientProps) {
  const { data, error, isRefreshing } = useLiveResults(initialData);
  const [activeModule, setActiveModule] = useState<ActiveModule>(() =>
    pickInitialModule(initialData)
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    () => initialData.moduleB.categories[0]?.id ?? null
  );
  const [clock, setClock] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString("es-BO", {
          hour12: false,
          timeZone: "America/La_Paz",
        })
      );
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const activeCategory = useMemo(
    () =>
      data.moduleB.categories.find((category) => category.id === activeCategoryId) ??
      data.moduleB.categories[0] ??
      null,
    [activeCategoryId, data.moduleB.categories]
  );

  const danceItems = data.moduleA.items;
  const candidateItems = activeCategory?.items ?? [];
  const current = activeModule === "A" ? data.moduleA.current : data.moduleB.current;
  const summary = activeModule === "A" ? data.moduleA.summary : data.moduleB.summary;
  const isFinal = activeModule === "A" ? data.moduleA.isFinal : data.moduleB.isFinal;
  const categoryScored = candidateItems.filter((item) => item.votesCount > 0).length;
  const categoryVotes = candidateItems.reduce((sum, item) => sum + item.votesCount, 0);

  const topDance = danceItems.filter((item) => item.rank !== null).slice(0, 10);
  const topCandidates = candidateItems.filter((item) => item.rank !== null).slice(0, 10);
  const podiumDance = danceItems.filter((item) => item.rank !== null && item.rank <= 3);
  const podiumCandidates = candidateItems.filter(
    (item) => item.rank !== null && item.rank <= 3
  );
  const podium = activeModule === "A" ? podiumDance : podiumCandidates;

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // El navegador puede bloquear pantalla completa; no es un error crítico.
    }
  };

  const progress = current
    ? Math.min(100, (current.votesCount / Math.max(current.juryCount, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl shrink-0">
              🏛️
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-wider uppercase">
                  CUB • FUL-UABJB
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  Trinidad, Beni
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                {data.edition.name} {data.edition.year}
              </h1>
              <p className="text-xs text-slate-400">
                Resultados oficiales en vivo • Pantalla de auditorio
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              EN VIVO
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Hora oficial
              </div>
              <div className="font-mono text-sm font-bold text-white tabular-nums">
                {clock || "--:--:--"}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            </button>

            <Link
              href="/resultados"
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
            >
              Resultados detallados →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 flex items-center justify-between gap-3">
            <span>⚠️ {error}</span>
            <span className="text-amber-400/70">
              Última actualización: {formatTime(data.updatedAt)}
            </span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="inline-flex rounded-2xl bg-slate-900 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setActiveModule("A")}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeModule === "A"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Módulo A · Entrada Folklórica
            </button>
            <button
              type="button"
              onClick={() => setActiveModule("B")}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeModule === "B"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Módulo B · Moperita y Ñusta
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span
              className={`px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${
                isFinal
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              {isFinal ? "Resultados finales" : "Resultados preliminares"}
            </span>
            <span>
              Actualizado a las {formatTime(data.updatedAt)}
              {isRefreshing ? " · actualizando…" : ""}
            </span>
          </div>
        </div>

        {activeModule === "B" && data.moduleB.categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {data.moduleB.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeCategory?.id === category.id
                    ? "bg-slate-100 text-slate-950 border-slate-100"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Tabla de posiciones en vivo
                </h2>
                <p className="text-xs text-slate-400">
                  {activeModule === "A"
                    ? "Grupos de danza · Top 10"
                    : `${activeCategory?.name ?? "Candidatas"} · Top 10`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-bold">
                  {activeModule === "A"
                    ? `${summary.scoredParticipants}/${summary.totalParticipants} calificadas`
                    : `${categoryScored}/${candidateItems.length} calificadas`}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-bold">
                  {activeModule === "A" ? summary.votesEmitted : categoryVotes} votos
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeModule === "A" ? (
                <table className="w-full min-w-[760px] text-left text-xs text-slate-300">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 pr-3">Puesto</th>
                      <th className="py-3 pr-3">Danza / Fraternidad</th>
                      <th className="py-3 pr-3 text-right">Votos</th>
                      <th className="py-3 pr-3 text-right">Promedio</th>
                      <th className="py-3 pr-3 text-right">Penal.</th>
                      <th className="py-3 text-right text-white">Nota final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {topDance.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.rank && item.rank <= 3
                            ? "bg-amber-500/[0.04]"
                            : "hover:bg-slate-800/40"
                        }
                      >
                        <td className="py-3 pr-3 font-bold text-amber-400 whitespace-nowrap">
                          {rankLabel(item.rank)}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-bold text-white">{item.danceName}</div>
                          <div className="text-[11px] text-slate-400">
                            {item.fraternityName} · {item.university}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {statusLabel(item.status)}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-slate-300">
                          {item.votesCount}/{item.juryCount}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-slate-300">
                          {formatScore(item.average)}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-rose-400">
                          {item.penaltyTotal > 0
                            ? `−${formatScore(item.penaltyTotal)}`
                            : "0.00"}
                        </td>
                        <td className="py-3 text-right font-mono text-base font-black text-white tabular-nums">
                          {formatScore(item.finalScore)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[860px] text-left text-xs text-slate-300">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 pr-3">Puesto</th>
                      <th className="py-3 pr-3">Candidata / Fraternidad</th>
                      <th className="py-3 pr-3 text-right">Votos</th>
                      <th className="py-3 pr-3 text-right">Gala</th>
                      <th className="py-3 pr-3 text-right">Casual</th>
                      <th className="py-3 pr-3 text-right">Típica</th>
                      <th className="py-3 text-right text-white">Nota final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {topCandidates.map((item) => (
                      <CandidateRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {(activeModule === "A" ? topDance.length === 0 : topCandidates.length === 0) && (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-sm font-semibold text-white">
                  Aún no hay calificaciones registradas
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  La tabla se actualizará automáticamente cuando los jurados emitan sus votos.
                </p>
              </div>
            )}

            <p className="text-[10px] text-slate-500 mt-4">
              Las posiciones pueden cambiar hasta el cierre de la votación. Esta pantalla se
              actualiza automáticamente cada pocos segundos.
            </p>
          </section>

          <aside className="xl:col-span-4 space-y-6">
            <section className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-amber-400 font-black">
                  {current ? "Ahora en escena" : "Esperando calificaciones"}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {activeModule === "A" ? "Módulo A" : "Módulo B"}
                </span>
              </div>

              {current ? (
                <>
                  <h3 className="text-2xl font-black text-white mt-3 leading-tight">
                    {current.name}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">{current.fraternityName}</p>
                  {current.categoryName && (
                    <p className="text-xs text-amber-400/80 mt-1">{current.categoryName}</p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Votos recibidos</span>
                      <span className="font-mono font-bold text-white">
                        {current.votesCount}/{current.juryCount}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                  Cuando un jurado emita la primera calificación, aquí aparecerá la danza o
                  candidata en evaluación.
                </p>
              )}
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Podio en vivo
                </h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Top 3
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {podium.length > 0 ? (
                  podium.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base shrink-0">
                        {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {"danceName" in item ? item.danceName : item.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {item.fraternityName}
                        </div>
                      </div>
                      <div className="text-sm font-black font-mono text-amber-400 tabular-nums">
                        {formatScore(
                          "finalScore" in item ? item.finalScore : item.totalScore
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    El podio se mostrará cuando existan al menos tres calificaciones.
                  </p>
                )}
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Participación
              </h3>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Stat label="Participantes" value={String(summary.totalParticipants)} />
                <Stat label="Calificadas" value={String(summary.scoredParticipants)} />
                <Stat label="Votos emitidos" value={String(summary.votesEmitted)} />
                <Stat label="Jurados" value={String(summary.totalJurors)} />
              </div>
              <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between gap-2">
                <span>Último voto</span>
                <span className="font-mono text-slate-400">
                  {formatTime(summary.lastVoteAt)}
                </span>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/80 px-4 sm:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>
            Sistema oficial de calificación · Confederación Universitaria Boliviana (CUB) ·
            FUL-UABJB
          </span>
          <div className="flex items-center gap-3">
            <span>Resultados preliminares en vivo</span>
            <Link href="/resultados" className="text-amber-400 hover:text-amber-300 font-semibold">
              Ver detalle completo →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CandidateRow({ item }: { item: LiveCandidateItem }) {
  const gala = item.runways.find((runway) => runway.type === "GALA");
  const casual = item.runways.find((runway) => runway.type === "CASUAL");
  const tipica = item.runways.find((runway) => runway.type === "TIPICA");

  return (
    <tr
      className={
        item.rank && item.rank <= 3 ? "bg-amber-500/[0.04]" : "hover:bg-slate-800/40"
      }
    >
      <td className="py-3 pr-3 font-bold text-amber-400 whitespace-nowrap">
        {rankLabel(item.rank)}
      </td>
      <td className="py-3 pr-3">
        <div className="font-bold text-white">{item.fullName}</div>
        <div className="text-[11px] text-slate-400">
          {item.fraternityName} · {item.university}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">{item.categoryName}</div>
      </td>
      <td className="py-3 pr-3 text-right font-mono text-slate-300">
        {item.votesCount}/{item.runways.length * item.juryCount}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-slate-300">
        {formatScore(gala?.average ?? 0)}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-slate-300">
        {formatScore(casual?.average ?? 0)}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-slate-300">
        {formatScore(tipica?.average ?? 0)}
      </td>
      <td className="py-3 text-right font-mono text-base font-black text-white tabular-nums">
        {formatScore(item.totalScore)}
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
        {label}
      </div>
      <div className="text-lg font-black text-white font-mono tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  );
}
