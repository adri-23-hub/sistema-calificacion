import TableScroll from "@/components/TableScroll";
import Link from "next/link";

export interface NotaryVotingStatusItem {
  id: string;
  name: string;
  type: "GRUPO_DANZA" | "CANDIDATA";
  fraternityName: string;
  votesCount: number;
  status: string;
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
  votingProgress: NotaryVotingStatusItem[];
  auditLogs: NotaryAuditItem[];
}

export default function NotariaClient({
  notaryName,
  votingProgress,
  auditLogs,
}: NotariaClientProps) {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Notaría de Fe Pública • Fiscalización Oficial
            </span>
            <span className="text-xs text-slate-400">{notaryName}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Panel Notarial de Fe Pública
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Supervisión del proceso electoral universitario, recepción de votos y registro
            inmutable de auditoría.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Resultados públicos en vivo
          </span>
          <Link
            href="/resultados"
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Ver resultados →
          </Link>
        </div>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-bold text-white">
              Estado de Participantes y Votaciones
            </h2>
            <p className="text-xs text-slate-400">
              La Notaría fiscaliza la recepción de votos. Los resultados agregados son
              públicos en tiempo real; las notas individuales de cada jurado se mantienen
              reservadas.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {votingProgress.length} registros
          </span>
        </div>

        <TableScroll>
          <table className="w-full min-w-[720px] text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Participante / Danza</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Fraternidad</th>
                <th className="p-3">Votos Emitidos</th>
                <th className="p-3">Estado</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Libro Notarial de Auditoría</h2>
        <p className="text-xs text-slate-400">
          Registro cronológico e inmutable de eventos: votos emitidos, penalizaciones,
          anulaciones con motivo y cambios de configuración.
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
