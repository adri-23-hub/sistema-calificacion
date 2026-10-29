"use client";

import { useState } from "react";
import { exportResultsToExcel } from "@/lib/export-excel";
import Link from "next/link";

export interface DanceResultItem {
  puesto: number | string;
  id: string;
  entryOrder: number | null;
  danceName: string;
  fraternityName: string;
  university: string;
  department: string;
  numberOfDancers: number;
  average: number;
  yellowFlags: number;
  redFlags: number;
  orderViolation: boolean;
  manualDeductions: number;
  penaltyTotal: number;
  finalScore: number;
  isDisqualified: boolean;
  disqualifyReason?: string | null;
}

export interface CandidateResultItem {
  puesto: number | string;
  id: string;
  fullName: string;
  categoryName: string;
  fraternityName: string;
  university: string;
  photoUrl: string | null;
  galaScore: number;
  casualScore: number;
  tipicaScore: number;
  totalScore: number;
}

interface ResultadosClientProps {
  editionName: string;
  year: number;
  resultsRevealed: boolean;
  adminConfirmedAt: string | null;
  notaryConfirmedAt: string | null;
  danceGroups: DanceResultItem[];
  candidates: CandidateResultItem[];
}

export default function ResultadosClient({
  editionName,
  year,
  resultsRevealed,
  adminConfirmedAt,
  notaryConfirmedAt,
  danceGroups,
  candidates,
}: ResultadosClientProps) {
  const [activeTab, setActiveTab] = useState<"danzas" | "candidatas">("danzas");
  const [search, setSearch] = useState("");

  const handleExport = () => {
    exportResultsToExcel({
      editionName,
      danceGroups: danceGroups.map((d) => ({
        puesto: d.puesto,
        danza: d.danceName,
        fraternidad: d.fraternityName,
        universidad: d.university,
        departamento: d.department,
        promedioJurados: d.average,
        amarillas: d.yellowFlags,
        rojas: d.redFlags,
        ordenIncumplido: d.orderViolation ? "SÍ" : "NO",
        descuentosManuales: d.manualDeductions,
        totalPenalizaciones: d.penaltyTotal,
        notaFinal: d.finalScore,
        estado: d.isDisqualified ? "DESCALIFICADO" : "VÁLIDO",
      })),
      candidates: candidates.map((c) => ({
        puesto: c.puesto,
        candidata: c.fullName,
        categoria: c.categoryName,
        fraternidad: c.fraternityName,
        pasarelaGala: c.galaScore,
        pasarelaCasual: c.casualScore,
        pasarelaTipica: c.tipicaScore,
        notaFinal: c.totalScore,
      })),
      filename: `Resultados_Oficiales_${editionName.replace(/\s+/g, "_")}.xlsx`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtrado
  const filteredDance = danceGroups.filter(
    (d) =>
      d.danceName.toLowerCase().includes(search.toLowerCase()) ||
      d.fraternityName.toLowerCase().includes(search.toLowerCase()) ||
      d.university.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header oficial */}
      <header className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <span>🏛️</span>
          <span>CONFEDERACIÓN UNIVERSITARIA BOLIVIANA • FUL UABJB</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Resultados Oficiales de la Entrada Folklórica
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          {editionName} • Trinidad, Beni • Calificación oficial y auditoría notarial.
        </p>
      </header>

      {/* Si NO se han revelado los resultados: Modo Sobre Cerrado */}
      {!resultsRevealed && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-4xl">
            🔒
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Votaciones en Modo "Sobre Cerrado"
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Las calificaciones de los jurados se encuentran aseguradas en plicas digitales con cadena criptográfica.
              Por estricto reglamento, las notas serán reveladas únicamente en el <strong>acto público de apertura oficial</strong> con la doble confirmación del Comité Organizador y el Notario de Fe Pública.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-left bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="text-slate-500 uppercase font-bold text-[10px]">Comité Organizador:</div>
              <div className="text-white font-medium mt-0.5">
                {adminConfirmedAt ? "✓ Confirmado" : "⏳ Pendiente"}
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase font-bold text-[10px]">Notario de Fe Pública:</div>
              <div className="text-white font-medium mt-0.5">
                {notaryConfirmedAt ? "✓ Confirmado" : "⏳ Pendiente"}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Iniciar Sesión de Personal Autorizado
            </Link>
          </div>
        </div>
      )}

      {/* Si SÍ se han revelado los resultados: Tabla de Ganadores y Ranking */}
      {resultsRevealed && (
        <>
          {/* Botones de acción (Exportar y Imprimir) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 print:hidden">
            {/* Selector de módulo */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("danzas")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "danzas"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Módulo A: Entrada Folklórica (Danzas)
              </button>
              <button
                onClick={() => setActiveTab("candidatas")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "candidatas"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Módulo B: Moperita y Ñusta 2026
              </button>
            </div>

            {/* Exportaciones */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>📊</span>
                <span>Descargar Excel (.xlsx)</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 transition-all"
              >
                <span>🖨️</span>
                <span>Imprimir Acta Oficial</span>
              </button>
            </div>
          </div>

          {/* PODIO DE GANADORES (TOP 3) - Módulo A */}
          {activeTab === "danzas" && danceGroups.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* 2.º Lugar */}
              <div className="order-2 md:order-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
                <div className="w-12 h-12 bg-slate-400/10 text-slate-300 font-bold text-2xl rounded-2xl flex items-center justify-center mx-auto border border-slate-400/30">
                  🥈
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2.º Lugar • Trofeo de Plata
                </div>
                <h3 className="text-xl font-bold text-white">{danceGroups[1].danceName}</h3>
                <p className="text-xs text-slate-400">{danceGroups[1].fraternityName}</p>
                <div className="text-3xl font-extrabold text-white font-mono pt-2">
                  {danceGroups[1].finalScore.toFixed(2)} pts
                </div>
              </div>

              {/* 1.er Lugar (Centro, más destacado) */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-8 text-center space-y-4 relative overflow-hidden shadow-2xl scale-105">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-400 font-bold text-3xl rounded-2xl flex items-center justify-center mx-auto border border-amber-500/50 shadow-lg shadow-amber-500/30">
                  🥇
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Gran Campeón • 1.er Lugar
                </div>
                <h3 className="text-2xl font-black text-white">{danceGroups[0].danceName}</h3>
                <p className="text-sm font-semibold text-slate-300">{danceGroups[0].fraternityName}</p>
                <div className="text-4xl font-black text-amber-400 font-mono pt-2">
                  {danceGroups[0].finalScore.toFixed(2)} pts
                </div>
                <div className="text-xs text-emerald-400 font-semibold">
                  Trofeo Institucional + Premio de Honor
                </div>
              </div>

              {/* 3.er Lugar */}
              <div className="order-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
                <div className="w-12 h-12 bg-amber-700/10 text-amber-600 font-bold text-2xl rounded-2xl flex items-center justify-center mx-auto border border-amber-700/30">
                  🥉
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3.er Lugar • Trofeo de Bronce
                </div>
                <h3 className="text-xl font-bold text-white">{danceGroups[2].danceName}</h3>
                <p className="text-xs text-slate-400">{danceGroups[2].fraternityName}</p>
                <div className="text-3xl font-extrabold text-white font-mono pt-2">
                  {danceGroups[2].finalScore.toFixed(2)} pts
                </div>
              </div>
            </div>
          )}

          {/* TABLA COMPLETA: MÓDULO A */}
          {activeTab === "danzas" && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-lg font-bold text-white">Tabla General de Calificaciones</h3>
                <input
                  type="text"
                  placeholder="Buscar danza o fraternidad..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Puesto</th>
                      <th className="p-3">Danza</th>
                      <th className="p-3">Fraternidad / Universidad</th>
                      <th className="p-3 text-right">Promedio Jurados</th>
                      <th className="p-3 text-right">Penalizaciones</th>
                      <th className="p-3 text-right font-bold text-white">Nota Final</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredDance.map((g, idx) => (
                      <tr key={g.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-amber-400">
                          {idx === 0 && "🥇 1.º"}
                          {idx === 1 && "🥈 2.º"}
                          {idx === 2 && "🥉 3.º"}
                          {idx > 2 && `${idx + 1}.º`}
                        </td>
                        <td className="p-3 font-semibold text-white">{g.danceName}</td>
                        <td className="p-3">
                          <div>{g.fraternityName}</div>
                          <div className="text-[11px] text-slate-500">{g.university}</div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-200">
                          {g.average.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-400">
                          {g.penaltyTotal > 0 ? `−${g.penaltyTotal.toFixed(2)}` : "0.00"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white text-sm">
                          {g.isDisqualified ? "0.00" : g.finalScore.toFixed(2)}
                        </td>
                        <td className="p-3">
                          {g.isDisqualified ? (
                            <span className="text-rose-400 font-semibold">DESCALIFICADO</span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">VÁLIDO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLA COMPLETA: MÓDULO B */}
          {activeTab === "candidatas" && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white">
                Elección de Moperita y Ñusta de Bolivia 2026
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Puesto</th>
                      <th className="p-3">Candidata</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Fraternidad</th>
                      <th className="p-3 text-right">Ropa de Gala</th>
                      <th className="p-3 text-right">Ropa Casual</th>
                      <th className="p-3 text-right">Ropa Típica</th>
                      <th className="p-3 text-right font-bold text-white">Nota Ponderada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {candidates.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-amber-400">
                          {idx === 0 && "👑 Ganadora"}
                          {idx === 1 && "🥈 2.ª"}
                          {idx === 2 && "🥉 3.ª"}
                          {idx > 2 && `${idx + 1}.ª`}
                        </td>
                        <td className="p-3 font-semibold text-white">{c.fullName}</td>
                        <td className="p-3">{c.categoryName}</td>
                        <td className="p-3">{c.fraternityName}</td>
                        <td className="p-3 text-right font-mono">{c.galaScore.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{c.casualScore.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{c.tipicaScore.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-white text-sm">
                          {c.totalScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
