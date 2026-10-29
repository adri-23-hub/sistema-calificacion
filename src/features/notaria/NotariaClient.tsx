"use client";

import { useState, useTransition } from "react";
import { confirmOpeningNotaryAction } from "@/features/admin/actions";

export interface NotaryEditionData {
  id: string;
  name: string;
  year: number;
  adminConfirmedAt: string | null;
  notaryConfirmedAt: string | null;
  resultsRevealed: boolean;
}

export interface NotaryVotingStatusItem {
  id: string;
  name: string;
  type: "GRUPO_DANZA" | "CANDIDATA";
  fraternityName: string;
  votesCount: number;
  status: string;
  scoreStatusText: string;
}

export interface NotaryAuditItem {
  id: string;
  type: string;
  actorName: string;
  entityType?: string;
  createdAt: string;
  metadata?: unknown;
}

interface NotariaClientProps {
  notaryName: string;
  edition: NotaryEditionData;
  votingProgress: NotaryVotingStatusItem[];
  auditLogs: NotaryAuditItem[];
}

export default function NotariaClient({
  notaryName,
  edition: initialEdition,
  votingProgress,
  auditLogs,
}: NotariaClientProps) {
  const [edition, setEdition] = useState<NotaryEditionData>(initialEdition);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleConfirmNotary = () => {
    startTransition(async () => {
      const res = await confirmOpeningNotaryAction(edition.id);
      if (res.success) {
        setEdition((prev) => ({
          ...prev,
          notaryConfirmedAt: new Date().toISOString(),
          resultsRevealed: !!prev.adminConfirmedAt,
        }));
        setFeedback({
          type: "success",
          text: "Apertura oficial confirmada por Notaría de Fe Pública.",
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Error al confirmar la apertura.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Notaría de Fe Pública • Fiscalización Oficial
            </span>
            <span className="text-xs text-slate-400">{notaryName}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Panel Notarial de Fe Pública
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Supervisión del proceso electoral universitario, registro inmutable de auditoría y apertura oficial de resultados.
          </p>
        </div>

        {/* Badge de estado */}
        <div
          className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            edition.resultsRevealed
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <span>{edition.resultsRevealed ? "🔓" : "🔒"}</span>
          <span>
            {edition.resultsRevealed
              ? "Sobres Abiertos Oficialmente"
              : "Plicas en Sobre Cerrado Criptográfico"}
          </span>
        </div>
      </header>

      {/* Alerta de feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Sección: Doble Confirmación de Apertura Oficial */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">
          Acto de Apertura Oficial de Plicas (Lunes 16 de Noviembre)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          En cumplimiento del reglamento, la apertura pública de las notas de jurados exige la confirmación concurrente del Comité Organizador y del Notario de Fe Pública.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Estado ADMIN */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold uppercase">1. Comité Organizador</div>
            <div className="font-bold text-white mt-1">
              {edition.adminConfirmedAt ? "✓ Confirmado por ADMIN" : "⏳ Pendiente de confirmación"}
            </div>
            {edition.adminConfirmedAt && (
              <div className="text-[11px] text-emerald-400 mt-1">
                {new Date(edition.adminConfirmedAt).toLocaleString("es-BO")}
              </div>
            )}
          </div>

          {/* Estado NOTARIO */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">2. Notaría de Fe Pública</div>
              <div className="font-bold text-white mt-1">
                {edition.notaryConfirmedAt ? "✓ Confirmado por NOTARIO" : "Pendiente de tu firma digital"}
              </div>
              {edition.notaryConfirmedAt && (
                <div className="text-[11px] text-emerald-400 mt-1">
                  {new Date(edition.notaryConfirmedAt).toLocaleString("es-BO")}
                </div>
              )}
            </div>

            {!edition.notaryConfirmedAt && (
              <button
                disabled={isPending}
                onClick={handleConfirmNotary}
                className="mt-3 w-full py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Confirmando..." : "Firmar y Confirmar Apertura Oficial"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sección: Estado de Votaciones (Sobre Cerrado) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Estado de Participantes y Votaciones</h2>
            <p className="text-xs text-slate-400">
              {edition.resultsRevealed
                ? "Notas visibles tras apertura oficial"
                : "Se visualiza la recepción de votos. Los valores numéricos permanecen cifrados."}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {votingProgress.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Participante / Danza</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Fraternidad</th>
                <th className="p-3">Votos Emitidos</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Visibilidad de Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {votingProgress.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{item.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                      {item.type === "GRUPO_DANZA" ? "Módulo A (Danza)" : "Módulo B (Candidata)"}
                    </span>
                  </td>
                  <td className="p-3">{item.fraternityName}</td>
                  <td className="p-3 font-mono font-bold text-amber-400">
                    {item.votesCount} votos
                  </td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3 text-right font-mono">
                    {edition.resultsRevealed ? (
                      <span className="text-emerald-400 font-bold">ABIERTO</span>
                    ) : (
                      <span className="text-amber-400 font-medium">🔒 SOBRE CERRADO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección: Registro Inmutable de Auditoría */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Libro Notarial de Auditoría</h2>
        <p className="text-xs text-slate-400">
          Registro cronológico e inmutable de eventos: votos emitidos, penalizaciones, anulaciones con motivo y aperturas oficiales.
        </p>

        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-1"
            >
              <div>
                <span className="font-mono font-bold text-teal-400 mr-2">{log.type}</span>
                <span className="text-slate-300">Actor: {log.actorName}</span>
                {log.entityType && (
                  <span className="text-slate-500 ml-2">({log.entityType})</span>
                )}
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                {new Date(log.createdAt).toLocaleString("es-BO")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
