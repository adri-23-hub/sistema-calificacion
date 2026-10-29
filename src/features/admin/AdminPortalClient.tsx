"use client";

import { useState, useTransition } from "react";
import {
  confirmOpeningAdminAction,
  updateEventConfigAction,
} from "@/features/admin/actions";
import {
  disqualifyGroupAction,
  changeGroupStatusAction,
  registerPenaltyAction,
  voidPenaltyAction,
  voidDanceScoreAction as voidScoreAction,
} from "@/features/danza/actions";
import { exportResultsToExcel } from "@/lib/export-excel";

export interface AdminEditionData {
  id: string;
  name: string;
  year: number;
  adminConfirmedAt: string | null;
  notaryConfirmedAt: string | null;
  resultsRevealed: boolean;
  scoringRule: "MEAN" | "TRIMMED_MEAN";
  decimals: number;
}

export interface AdminGroupItem {
  id: string;
  entryOrder: number | null;
  danceName: string;
  fraternityName: string;
  university: string;
  department: string;
  numberOfDancers: number;
  status: "PENDING" | "IN_SCORING" | "CLOSED";
  isDisqualified: boolean;
  disqualifyReason: string | null;
  arrivalTime: string | null;
  votesCount: number;
  averageScore?: number;
  penaltiesTotal?: number;
  finalScore?: number;
  penalties: Array<{
    id: string;
    type: string;
    points: number;
    observation: string | null;
    registeredAt: string;
    registeredBy: string;
    isVoided: boolean;
  }>;
}

export interface AdminCandidateItem {
  id: string;
  fullName: string;
  categoryName: string;
  fraternityName: string;
  university: string;
  photoUrl: string | null;
  votesCount: number;
  finalScore?: number;
}

export interface AdminAuditItem {
  id: string;
  type: string;
  actorName?: string;
  entityType?: string;
  createdAt: string;
  metadata?: unknown;
}

interface AdminPortalClientProps {
  adminName: string;
  edition: AdminEditionData;
  groups: AdminGroupItem[];
  candidates: AdminCandidateItem[];
  recentAudits: AdminAuditItem[];
  hasSubmittedVotes: boolean;
}

export default function AdminPortalClient({
  adminName,
  edition: initialEdition,
  groups: initialGroups,
  candidates,
  recentAudits,
  hasSubmittedVotes,
}: AdminPortalClientProps) {
  const [edition, setEdition] = useState<AdminEditionData>(initialEdition);
  const [groups, setGroups] = useState<AdminGroupItem[]>(initialGroups);
  const [activeTab, setActiveTab] = useState<"opening" | "groups" | "penalties" | "config" | "results" | "audit">("opening");
  const [isPending, startTransition] = useTransition();

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Modales
  const [disqualifyModal, setDisqualifyModal] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
    reason: string;
  }>({ isOpen: false, groupId: "", groupName: "", reason: "" });

  const [voidPenaltyModal, setVoidPenaltyModal] = useState<{
    isOpen: boolean;
    penaltyId: string;
    groupName: string;
    reason: string;
  }>({ isOpen: false, penaltyId: "", groupName: "", reason: "" });

  // Configuración editable
  const [configForm, setConfigForm] = useState({
    coreografiaWeight: 40,
    vestimentaWeight: 30,
    entusiasmoWeight: 30,
    scoringRule: edition.scoringRule,
    yellowPenalty: 5,
    redPenalty: 10,
    orderPenalty: 5,
  });

  // Confirmar apertura oficial
  const handleConfirmOpening = () => {
    startTransition(async () => {
      const res = await confirmOpeningAdminAction(edition.id);
      if (res.success) {
        setEdition((prev) => ({
          ...prev,
          adminConfirmedAt: new Date().toISOString(),
          resultsRevealed: !!prev.notaryConfirmedAt,
        }));
        showFeedback("success", "Apertura oficial confirmada por el Comité Organizador (ADMIN)");
      } else {
        showFeedback("error", res.error || "Error al confirmar apertura");
      }
    });
  };

  // Cambiar estado de grupo
  const handleChangeGroupStatus = (groupId: string, newStatus: "PENDING" | "IN_SCORING" | "CLOSED") => {
    startTransition(async () => {
      const res = await changeGroupStatusAction({ danceGroupId: groupId, status: newStatus });
      if (res.success) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, status: newStatus } : g))
        );
        showFeedback("success", `Estado actualizado a ${newStatus}`);
      } else {
        showFeedback("error", res.error || "Error al cambiar estado");
      }
    });
  };

  // Descalificar grupo
  const handleDisqualify = () => {
    if (!disqualifyModal.reason.trim()) {
      showFeedback("error", "El motivo de descalificación es obligatorio");
      return;
    }
    startTransition(async () => {
      const res = await disqualifyGroupAction({
        danceGroupId: disqualifyModal.groupId,
        reason: disqualifyModal.reason,
      });
      if (res.success) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === disqualifyModal.groupId
              ? { ...g, isDisqualified: true, disqualifyReason: disqualifyModal.reason }
              : g
          )
        );
        setDisqualifyModal({ isOpen: false, groupId: "", groupName: "", reason: "" });
        showFeedback("success", "Grupo descalificado correctamente y registrado en auditoría");
      } else {
        showFeedback("error", res.error || "Error al descalificar");
      }
    });
  };

  // Anular penalización
  const handleVoidPenalty = () => {
    if (!voidPenaltyModal.reason.trim()) {
      showFeedback("error", "El motivo de anulación es obligatorio");
      return;
    }
    startTransition(async () => {
      const res = await voidPenaltyAction({
        penaltyId: voidPenaltyModal.penaltyId,
        reason: voidPenaltyModal.reason,
      });
      if (res.success) {
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            penalties: g.penalties.map((p) =>
              p.id === voidPenaltyModal.penaltyId ? { ...p, isVoided: true } : p
            ),
          }))
        );
        setVoidPenaltyModal({ isOpen: false, penaltyId: "", groupName: "", reason: "" });
        showFeedback("success", "Penalización anulada con registro en auditoría");
      } else {
        showFeedback("error", res.error || "Error al anular penalización");
      }
    });
  };

  // Guardar configuración
  const handleSaveConfig = () => {
    const totalWeights =
      configForm.coreografiaWeight + configForm.vestimentaWeight + configForm.entusiasmoWeight;
    if (totalWeights !== 100) {
      showFeedback("error", `Los pesos deben sumar exactamente 100%. Suma actual: ${totalWeights}%`);
      return;
    }

    startTransition(async () => {
      const res = await updateEventConfigAction({
        editionId: edition.id,
        key: "moduleA.weights",
        value: {
          coreografia: configForm.coreografiaWeight / 100,
          vestimenta: configForm.vestimentaWeight / 100,
          entusiasmo: configForm.entusiasmoWeight / 100,
          scoringRule: configForm.scoringRule,
        },
        description: "Pesos y regla de calificación para Módulo A (Entrada Folklórica)",
      });

      if (res.success) {
        showFeedback("success", "Configuración guardada exitosamente");
      } else {
        showFeedback("error", res.error || "Error al guardar configuración");
      }
    });
  };

  // Exportar Excel
  const handleExportExcel = () => {
    const exportData = groups.map((g, idx) => ({
      puesto: g.isDisqualified ? "DESCALIFICADO" : idx + 1,
      danza: g.danceName,
      fraternidad: g.fraternityName,
      universidad: g.university,
      departamento: g.department,
      promedioJurados: g.averageScore || 0,
      amarillas: g.penalties.filter((p) => !p.isVoided && p.type === "YELLOW_FLAG").length,
      rojas: g.penalties.filter((p) => !p.isVoided && p.type === "RED_FLAG").length,
      ordenIncumplido: g.penalties.some((p) => !p.isVoided && p.type === "ORDER_VIOLATION") ? "SÍ" : "NO",
      descuentosManuales: g.penalties
        .filter((p) => !p.isVoided && p.type === "MANUAL_DEDUCTION")
        .reduce((sum, p) => sum + p.points, 0),
      totalPenalizaciones: g.penaltiesTotal || 0,
      notaFinal: g.isDisqualified ? 0 : g.finalScore || 0,
      estado: g.isDisqualified ? "DESCALIFICADO" : g.status,
    }));

    exportResultsToExcel({
      editionName: edition.name,
      danceGroups: exportData,
      filename: `Resultados_${edition.name.replace(/\s+/g, "_")}.xlsx`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Comité Organizador • ADMIN
            </span>
            <span className="text-xs text-slate-400">{adminName}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{edition.name}</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Panel de control general, apertura oficial, auditoría y gestión de calificaciones.
          </p>
        </div>

        {/* Estado de sobre cerrado */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              edition.resultsRevealed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <span>{edition.resultsRevealed ? "🔓" : "🔒"}</span>
            <span>
              {edition.resultsRevealed
                ? "Resultados Revelados Oficialmente"
                : "Modo Sobre Cerrado (Notas Bloqueadas)"}
            </span>
          </div>
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {[
          { id: "opening", label: "Apertura Oficial (Doble Confirmación)" },
          { id: "groups", label: `Grupos de Danza (${groups.length})` },
          { id: "penalties", label: "Penalizaciones y Sanciones" },
          { id: "config", label: "Configuración del Evento" },
          { id: "results", label: "Resultados y Exportación" },
          { id: "audit", label: "Auditoría en Tiempo Real" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: APERTURA OFICIAL */}
      {activeTab === "opening" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              Apertura Oficial con Doble Confirmación
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Por reglamento, las notas numéricas no son visibles para nadie hasta que tanto el{" "}
              <strong>Comité Organizador (ADMIN)</strong> como el <strong>Notario de Fe Pública</strong>{" "}
              confirmen la apertura en acto público con sus respectivas sesiones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paso 1: Admin */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Paso 1: Comité Organizador
                </span>
                {edition.adminConfirmedAt ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✓ Confirmado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Pendiente
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white text-base">Firma Digital del Administrador</h3>
              <p className="text-xs text-slate-400">
                {edition.adminConfirmedAt
                  ? `Confirmado el ${new Date(edition.adminConfirmedAt).toLocaleString("es-BO")}`
                  : "Presiona para autorizar la apertura oficial de las plicas/sobres digitales."}
              </p>
              {!edition.adminConfirmedAt && (
                <button
                  disabled={isPending}
                  onClick={handleConfirmOpening}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isPending ? "Confirmando..." : "Confirmar Apertura (ADMIN)"}
                </button>
              )}
            </div>

            {/* Paso 2: Notario */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Paso 2: Notario de Fe Pública
                </span>
                {edition.notaryConfirmedAt ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✓ Confirmado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Pendiente
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white text-base">Firma Digital del Notario</h3>
              <p className="text-xs text-slate-400">
                {edition.notaryConfirmedAt
                  ? `Confirmado el ${new Date(edition.notaryConfirmedAt).toLocaleString("es-BO")}`
                  : "El Notario debe iniciar sesión en su propio panel (/notaria) para confirmar."}
              </p>
              <div className="text-xs text-slate-500 italic">
                {edition.notaryConfirmedAt
                  ? "Verificado y firmado."
                  : "A la espera de la confirmación del Notario con su credencial."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRUPOS DE DANZA */}
      {activeTab === "groups" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Grupos de Danza (Módulo A)</h2>
            <span className="text-xs text-slate-400">Total: {groups.length} grupos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Orden</th>
                  <th className="p-3">Danza</th>
                  <th className="p-3">Fraternidad / Universidad</th>
                  <th className="p-3">Bailarines</th>
                  <th className="p-3">Votos</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-amber-400">#{group.entryOrder || "—"}</td>
                    <td className="p-3 font-semibold text-white">{group.danceName}</td>
                    <td className="p-3">
                      <div>{group.fraternityName}</div>
                      <div className="text-[11px] text-slate-400">{group.university}</div>
                    </td>
                    <td className="p-3">
                      <span className={group.numberOfDancers < 50 ? "text-amber-400 font-bold" : ""}>
                        {group.numberOfDancers}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{group.votesCount} jurados</td>
                    <td className="p-3">
                      {group.isDisqualified ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          DESCALIFICADO
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            group.status === "IN_SCORING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : group.status === "CLOSED"
                              ? "bg-slate-800 text-slate-400"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {group.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {/* Cambiar estado */}
                      {!group.isDisqualified && (
                        <>
                          {group.status === "PENDING" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleChangeGroupStatus(group.id, "IN_SCORING")}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs disabled:opacity-50"
                            >
                              Abrir Votación
                            </button>
                          )}
                          {group.status === "IN_SCORING" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleChangeGroupStatus(group.id, "CLOSED")}
                              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs disabled:opacity-50"
                            >
                              Cerrar Votos
                            </button>
                          )}
                        </>
                      )}

                      {/* Descalificar */}
                      {!group.isDisqualified && (
                        <button
                          disabled={isPending}
                          onClick={() =>
                            setDisqualifyModal({
                              isOpen: true,
                              groupId: group.id,
                              groupName: `${group.danceName} (${group.fraternityName})`,
                              reason: "",
                            })
                          }
                          className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 text-xs font-semibold disabled:opacity-50"
                        >
                          Descalificar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENALIZACIONES */}
      {activeTab === "penalties" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Registro General de Penalizaciones</h2>
          </div>

          <div className="space-y-3">
            {groups
              .flatMap((g) =>
                g.penalties.map((p) => ({
                  ...p,
                  groupName: `${g.entryOrder ? `#${g.entryOrder} ` : ""}${g.danceName} (${g.fraternityName})`,
                }))
              )
              .map((penalty) => (
                <div
                  key={penalty.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    penalty.isVoided
                      ? "bg-slate-950/40 border-slate-800/40 opacity-60 line-through"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{penalty.groupName}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {penalty.type}
                      </span>
                      {penalty.isVoided && (
                        <span className="text-xs text-rose-400 font-bold">ANULADA</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{penalty.observation || "Sin observación"}</p>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Registrado por: {penalty.registeredBy} •{" "}
                      {new Date(penalty.registeredAt).toLocaleString("es-BO")}
                    </div>
                  </div>

                  {!penalty.isVoided && (
                    <button
                      disabled={isPending}
                      onClick={() =>
                        setVoidPenaltyModal({
                          isOpen: true,
                          penaltyId: penalty.id,
                          groupName: penalty.groupName,
                          reason: "",
                        })
                      }
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-600/40"
                    >
                      Anular con Motivo
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURACIÓN */}
      {activeTab === "config" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Parámetros Configurables del Evento</h2>
            <p className="text-sm text-slate-400 mt-1">
              Todos los parámetros no especificados en el reglamento son configurables. Los cambios se registran en auditoría.
              {hasSubmittedVotes && (
                <span className="text-amber-400 block mt-1">
                  ⚠️ Ya existen votos emitidos en el sistema. Los cambios en pesos y escalas están protegidos por auditoría.
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Pesos de Criterios — Módulo A</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Coreografía (%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={configForm.coreografiaWeight}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, coreografiaWeight: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vestimenta (%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={configForm.vestimentaWeight}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, vestimentaWeight: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Entusiasmo (%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={configForm.entusiasmoWeight}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, entusiasmoWeight: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                />
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Suma total:{" "}
                <span
                  className={
                    configForm.coreografiaWeight + configForm.vestimentaWeight + configForm.entusiasmoWeight === 100
                      ? "text-emerald-400 font-bold"
                      : "text-rose-400 font-bold"
                  }
                >
                  {configForm.coreografiaWeight + configForm.vestimentaWeight + configForm.entusiasmoWeight}%
                </span>{" "}
                (debe ser 100%)
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Reglas de Cálculo y Penalizaciones</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Método de Agregación entre Jurados:
                </label>
                <select
                  value={configForm.scoringRule}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, scoringRule: e.target.value as "MEAN" | "TRIMMED_MEAN" }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                >
                  <option value="MEAN">Promedio Simple (MEAN)</option>
                  <option value="TRIMMED_MEAN">Promedio Recortado (descarta máx. y mín.)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Penalización cada 3 Banderolas Amarillas:
                </label>
                <input
                  type="number"
                  value={configForm.yellowPenalty}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400"
                />
                <span className="text-[11px] text-slate-500">Reglamento: −5 puntos por cada 3 amarillas</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Penalización por Banderola Roja:
                </label>
                <input
                  type="number"
                  value={configForm.redPenalty}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400"
                />
                <span className="text-[11px] text-slate-500">Reglamento: −10 puntos por cada roja</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              disabled={isPending}
              onClick={handleSaveConfig}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar y Registrar en Auditoría"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: RESULTADOS */}
      {activeTab === "results" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Resultados Oficiales de la Entrada</h2>
              <p className="text-xs text-slate-400">
                {edition.resultsRevealed
                  ? "Resultados oficiales abiertos al público"
                  : "Modo sobre cerrado: visible únicamente tras confirmación doble."}
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <span>📊</span>
              <span>Exportar a Excel (.xlsx)</span>
            </button>
          </div>

          {/* Ranking */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Puesto</th>
                  <th className="p-3">Danza</th>
                  <th className="p-3">Fraternidad / Universidad</th>
                  <th className="p-3 text-right">Promedio</th>
                  <th className="p-3 text-right">Penalizaciones</th>
                  <th className="p-3 text-right font-bold text-white">Nota Final</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {groups.map((group, idx) => (
                  <tr key={group.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-amber-400">
                      {idx === 0 && "🥇 1.º Lugar"}
                      {idx === 1 && "🥈 2.º Lugar"}
                      {idx === 2 && "🥉 3.º Lugar"}
                      {idx > 2 && `${idx + 1}.º`}
                    </td>
                    <td className="p-3 font-semibold text-white">{group.danceName}</td>
                    <td className="p-3">{group.fraternityName}</td>
                    <td className="p-3 text-right font-mono">
                      {edition.resultsRevealed ? (group.averageScore?.toFixed(2) || "0.00") : "🔒"}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400">
                      −{group.penaltiesTotal || 0}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white text-sm">
                      {edition.resultsRevealed ? (group.finalScore?.toFixed(2) || "0.00") : "🔒"}
                    </td>
                    <td className="p-3">
                      {group.isDisqualified ? (
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

      {/* TAB 6: AUDITORÍA */}
      {activeTab === "audit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white">Registro Inmutable de Auditoría</h2>
          <div className="space-y-2">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-indigo-400 mr-2">{audit.type}</span>
                  <span className="text-slate-300">
                    Entidad: {audit.entityType || "Sistema"}
                  </span>
                </div>
                <div className="text-slate-500 font-mono">
                  {new Date(audit.createdAt).toLocaleString("es-BO")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DESCALIFICACIÓN */}
      {disqualifyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-rose-400">Descalificar Grupo</h3>
            <p className="text-xs text-slate-300">
              Vas a descalificar a <strong>{disqualifyModal.groupName}</strong>. El grupo quedará fuera
              del ranking oficial pero conservará su historial de auditoría.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo reglamentario (proselitismo, baches, inasistencia, etc.):
              </label>
              <textarea
                rows={3}
                value={disqualifyModal.reason}
                onChange={(e) =>
                  setDisqualifyModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Indica el motivo exacto de la descalificación..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDisqualifyModal({ isOpen: false, groupId: "", groupName: "", reason: "" })}
                className="px-4 py-2 rounded-xl text-xs text-slate-400"
              >
                Cancelar
              </button>
              <button
                disabled={isPending || !disqualifyModal.reason.trim()}
                onClick={handleDisqualify}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
              >
                Confirmar Descalificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANULAR PENALIZACIÓN */}
      {voidPenaltyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Anular Penalización</h3>
            <p className="text-xs text-slate-300">
              Anulación de penalización para <strong>{voidPenaltyModal.groupName}</strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo de anulación (obligatorio para auditoría):
              </label>
              <textarea
                rows={3}
                value={voidPenaltyModal.reason}
                onChange={(e) =>
                  setVoidPenaltyModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Justificación del error de registro o reconsideración..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVoidPenaltyModal({ isOpen: false, penaltyId: "", groupName: "", reason: "" })}
                className="px-4 py-2 rounded-xl text-xs text-slate-400"
              >
                Cancelar
              </button>
              <button
                disabled={isPending || !voidPenaltyModal.reason.trim()}
                onClick={handleVoidPenalty}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
