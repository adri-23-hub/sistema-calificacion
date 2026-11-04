"use client";

import TableScroll from "@/components/TableScroll";
import Link from "next/link";
import { useMemo, useState } from "react";
import { exportResultsToExcel } from "@/lib/export-excel";
import { useLiveResults } from "@/features/live/useLiveResults";
import type {
  LiveCandidateItem,
  LiveDanceItem,
  LiveResultsPayload,
} from "@/features/live/types";

interface ResultadosClientProps {
  initialData: LiveResultsPayload;
}

type ActiveTab = "danzas" | "candidatas";

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

function rankLabel(rank: number | null, feminine = false): string {
  if (rank === 1) return feminine ? "👑 Ganadora" : "🥇 1.º";
  if (rank === 2) return feminine ? "🥈 2.ª" : "🥈 2.º";
  if (rank === 3) return feminine ? "🥉 3.ª" : "🥉 3.º";
  if (rank) return feminine ? `${rank}.ª` : `${rank}.º`;
  return "—";
}

function statusLabel(status: LiveDanceItem["status"]): string {
  if (status === "IN_SCORING") return "En calificación";
  if (status === "CLOSED") return "Cerrada";
  if (status === "DISQUALIFIED") return "Descalificado";
  return "Pendiente";
}

function itemName(item: LiveDanceItem | LiveCandidateItem): string {
  return "danceName" in item ? item.danceName : item.fullName;
}

function itemScore(item: LiveDanceItem | LiveCandidateItem): number {
  return "finalScore" in item ? item.finalScore : item.totalScore;
}

export default function ResultadosClient({ initialData }: ResultadosClientProps) {
  const { data, error, isRefreshing } = useLiveResults(initialData);
  const [activeTab, setActiveTab] = useState<ActiveTab>("danzas");
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    () => initialData.moduleB.categories[0]?.id ?? null
  );

  const activeCategory = useMemo(
    () =>
      data.moduleB.categories.find((category) => category.id === activeCategoryId) ??
      data.moduleB.categories[0] ??
      null,
    [activeCategoryId, data.moduleB.categories]
  );

  const danceGroups = data.moduleA.items;
  const candidates = activeCategory?.items ?? [];

  const filteredDance = danceGroups.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.danceName.toLowerCase().includes(term) ||
      item.fraternityName.toLowerCase().includes(term) ||
      item.university.toLowerCase().includes(term)
    );
  });

  const filteredCandidates = candidates.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.fullName.toLowerCase().includes(term) ||
      item.fraternityName.toLowerCase().includes(term) ||
      item.university.toLowerCase().includes(term)
    );
  });

  const podiumItems: Array<LiveDanceItem | LiveCandidateItem> =
    activeTab === "danzas"
      ? danceGroups.filter((item) => item.rank !== null && item.rank <= 3)
      : candidates.filter((item) => item.rank !== null && item.rank <= 3);

  const handleExport = () => {
    exportResultsToExcel({
      editionName: data.edition.name,
      danceGroups: danceGroups.map((item) => ({
        puesto: item.rank ?? (item.isDisqualified ? "DESCALIFICADO" : "—"),
        danza: item.danceName,
        fraternidad: item.fraternityName,
        universidad: item.university,
        departamento: item.department,
        promedioJurados: item.average,
        amarillas: item.yellowFlags,
        rojas: item.redFlags,
        ordenIncumplido: item.orderViolation ? "SÍ" : "NO",
        descuentosManuales: item.manualDeductions,
        totalPenalizaciones: item.penaltyTotal,
        notaFinal: item.finalScore,
        estado: item.isDisqualified
          ? "DESCALIFICADO"
          : statusLabel(item.status).toUpperCase(),
      })),
      candidates: data.moduleB.categories.flatMap((category) =>
        category.items.map((item) => ({
          puesto: item.rank ?? "—",
          candidata: item.fullName,
          categoria: item.categoryName,
          fraternidad: item.fraternityName,
          pasarelaGala:
            item.runways.find((runway) => runway.type === "GALA")?.average ?? 0,
          pasarelaCasual:
            item.runways.find((runway) => runway.type === "CASUAL")?.average ?? 0,
          pasarelaTipica:
            item.runways.find((runway) => runway.type === "TIPICA")?.average ?? 0,
          notaFinal: item.totalScore,
        }))
      ),
      filename: `Resultados_${data.edition.name.replace(/\s+/g, "_")}.xlsx`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      <header className="text-center space-y-3">
        <div className="inline-flex flex-wrap justify-center items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            🏛️ CONFEDERACIÓN UNIVERSITARIA BOLIVIANA • FUL UABJB
          </span>
          <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            EN VIVO
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Resultados de la Entrada Folklórica
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          {data.edition.name} {data.edition.year} • {data.edition.venue} • Calificación
          oficial en tiempo real.
        </p>
        <p className="text-xs text-slate-500">
          Actualizado a las {formatTime(data.updatedAt)}
          {isRefreshing ? " · actualizando…" : ""} · Las posiciones pueden cambiar hasta el
          cierre de la votación.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          ⚠️ {error} Se mantiene la última información disponible.
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("danzas");
              setSearch("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "danzas"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Módulo A: Entrada Folklórica
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("candidatas");
              setSearch("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "candidatas"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Módulo B: Moperita y Ñusta
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/vivo"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-2 transition-all"
          >
            <span>📺</span>
            <span>Pantalla de auditorio</span>
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <span>📊</span>
            <span>Descargar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 transition-all"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {activeTab === "candidatas" && data.moduleB.categories.length > 1 && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {data.moduleB.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setActiveCategoryId(category.id);
                setSearch("");
              }}
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

      {podiumItems.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="order-2 md:order-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 bg-slate-400/10 text-slate-300 font-bold text-2xl rounded-2xl flex items-center justify-center mx-auto border border-slate-400/30">
              🥈
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2.º Lugar • Trofeo de Plata
            </div>
            <h3 className="text-xl font-bold text-white">{itemName(podiumItems[1])}</h3>
            <p className="text-xs text-slate-400">{podiumItems[1].fraternityName}</p>
            <div className="text-3xl font-extrabold text-white font-mono pt-2">
              {formatScore(itemScore(podiumItems[1]))} pts
            </div>
          </div>

          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-8 text-center space-y-4 relative overflow-hidden shadow-2xl md:scale-105">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 font-bold text-3xl rounded-2xl flex items-center justify-center mx-auto border border-amber-500/50 shadow-lg shadow-amber-500/30">
              🥇
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-amber-400">
              {activeTab === "danzas" ? "Gran Campeón • 1.er Lugar" : "Ganadora • 1.er Lugar"}
            </div>
            <h3 className="text-2xl font-black text-white">{itemName(podiumItems[0])}</h3>
            <p className="text-sm font-semibold text-slate-300">
              {podiumItems[0].fraternityName}
            </p>
            <div className="text-4xl font-black text-amber-400 font-mono pt-2">
              {formatScore(itemScore(podiumItems[0]))} pts
            </div>
            <div className="text-xs text-emerald-400 font-semibold">
              {activeTab === "danzas"
                ? "Trofeo Institucional + Premio de Honor"
                : "Corona y Banda Oficial"}
            </div>
          </div>

          <div className="order-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 bg-amber-700/10 text-amber-600 font-bold text-2xl rounded-2xl flex items-center justify-center mx-auto border border-amber-700/30">
              🥉
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3.er Lugar • Trofeo de Bronce
            </div>
            <h3 className="text-xl font-bold text-white">{itemName(podiumItems[2])}</h3>
            <p className="text-xs text-slate-400">{podiumItems[2].fraternityName}</p>
            <div className="text-3xl font-extrabold text-white font-mono pt-2">
              {formatScore(itemScore(podiumItems[2]))} pts
            </div>
          </div>
        </div>
      )}

      {activeTab === "danzas" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Tabla General de Calificaciones</h3>
              <p className="text-xs text-slate-400">
                {data.moduleA.summary.scoredParticipants}/{data.moduleA.summary.totalParticipants}{" "}
                grupos calificados · {data.moduleA.summary.votesEmitted} votos emitidos
              </p>
            </div>
            <input
              type="text"
              placeholder="Buscar danza o fraternidad..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 w-full sm:w-64"
            />
          </div>

          <TableScroll>
            <table className="w-full min-w-[820px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Puesto</th>
                  <th className="p-3">Danza</th>
                  <th className="p-3">Fraternidad / Universidad</th>
                  <th className="p-3 text-right">Votos</th>
                  <th className="p-3 text-right">Promedio</th>
                  <th className="p-3 text-right">Penalizaciones</th>
                  <th className="p-3 text-right font-bold text-white">Nota Final</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-amber-400 whitespace-nowrap">
                      {item.isDisqualified ? "—" : rankLabel(item.rank)}
                    </td>
                    <td className="p-3 font-semibold text-white">{item.danceName}</td>
                    <td className="p-3">
                      <div>{item.fraternityName}</div>
                      <div className="text-[11px] text-slate-500">{item.university}</div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {item.votesCount}/{item.juryCount}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200">
                      {formatScore(item.average)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400">
                      {item.penaltyTotal > 0 ? `−${formatScore(item.penaltyTotal)}` : "0.00"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white text-sm">
                      {formatScore(item.finalScore)}
                    </td>
                    <td className="p-3">
                      {item.isDisqualified ? (
                        <span className="text-rose-400 font-semibold">DESCALIFICADO</span>
                      ) : (
                        <span
                          className={
                            item.status === "CLOSED"
                              ? "text-emerald-400 font-semibold"
                              : item.status === "IN_SCORING"
                                ? "text-amber-400 font-semibold"
                                : "text-slate-400 font-semibold"
                          }
                        >
                          {statusLabel(item.status).toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          {filteredDance.length === 0 && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm font-semibold text-white">
                Aún no hay calificaciones registradas
              </p>
              <p className="text-xs text-slate-400 mt-1">
                La tabla se actualizará automáticamente cuando los jurados emitan sus votos.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "candidatas" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">
                {activeCategory?.name ?? "Moperita y Ñusta de Bolivia"}
              </h3>
              <p className="text-xs text-slate-400">
                {activeCategory?.items.length ?? 0} candidatas ·{" "}
                {activeCategory?.items.reduce((sum, item) => sum + item.votesCount, 0) ?? 0}{" "}
                votos emitidos
              </p>
            </div>
            <input
              type="text"
              placeholder="Buscar candidata o fraternidad..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 w-full sm:w-64"
            />
          </div>

          <TableScroll>
            <table className="w-full min-w-[920px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Puesto</th>
                  <th className="p-3">Candidata</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Fraternidad</th>
                  <th className="p-3 text-right">Votos</th>
                  <th className="p-3 text-right">Ropa de Gala</th>
                  <th className="p-3 text-right">Ropa Casual</th>
                  <th className="p-3 text-right">Ropa Típica</th>
                  <th className="p-3 text-right font-bold text-white">Nota Ponderada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCandidates.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-amber-400 whitespace-nowrap">
                      {rankLabel(item.rank, true)}
                    </td>
                    <td className="p-3 font-semibold text-white">{item.fullName}</td>
                    <td className="p-3">{item.categoryName}</td>
                    <td className="p-3">{item.fraternityName}</td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {item.votesCount}/{item.runways.length * item.juryCount}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatScore(
                        item.runways.find((runway) => runway.type === "GALA")?.average ?? 0
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatScore(
                        item.runways.find((runway) => runway.type === "CASUAL")?.average ?? 0
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatScore(
                        item.runways.find((runway) => runway.type === "TIPICA")?.average ?? 0
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white text-sm">
                      {formatScore(item.totalScore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          {filteredCandidates.length === 0 && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm font-semibold text-white">
                Aún no hay calificaciones registradas
              </p>
              <p className="text-xs text-slate-400 mt-1">
                La tabla se actualizará automáticamente cuando los jurados emitan sus votos.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-500 text-center print:hidden">
        Resultados preliminares en vivo. Solo se publican promedios, penalizaciones y notas
        finales agregadas; las calificaciones individuales de cada jurado son reservadas.
      </p>
    </div>
  );
}
