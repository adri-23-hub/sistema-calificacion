"use client";

import TableScroll from "@/components/TableScroll";
import Link from "next/link";
import PhotoUpload from "@/features/admin/components/PhotoUpload";
import { useState, useTransition } from "react";
import { saveAllEventConfigsAction, setParticipantPhotoAction } from "@/features/admin/actions";
import {
  disqualifyGroupAction,
  changeGroupStatusAction,
  voidPenaltyAction,
} from "@/features/danza/actions";
import { exportResultsToExcel } from "@/lib/export-excel";
import DanceRegistrationModal, {
  type AdminFraternityOption,
  type DanceGroupFormData,
} from "@/features/admin/components/DanceRegistrationModal";

export interface AdminEditionData {
  id: string;
  name: string;
  year: number;
  scoringRule: "MEAN" | "TRIMMED_MEAN";
  decimals: number;
}

export interface AdminGroupItem {
  id: string;
  entryOrder: number | null;
  danceName: string;
  photoUrl?: string | null;
  fraternityId: string;
  fraternityName: string;
  university: string;
  department: string;
  numberOfDancers: number;
  status: "PENDING" | "IN_SCORING" | "CLOSED";
  hasCaratula?: boolean;
  hasMonografia?: boolean;
  hasDancerList?: boolean;
  hasInvitation?: boolean;
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
  categoryId: string;
  categoryName: string;
  categorySlug: string; // "moperita" | "nusta"
  fraternityName: string;
  university: string;
  photoUrl: string | null;
  votesCount: number;
  galaAverage?: number;
  casualAverage?: number;
  tipicaAverage?: number;
  totalScore?: number;
  rank?: number | null;
}

export interface AdminAuditItem {
  id: string;
  type: string;
  actorName?: string;
  entityType?: string;
  createdAt: string;
  metadata?: unknown;
}

export interface AdminConfigData {
  coreografiaWeight: number; // 40
  vestimentaWeight: number;  // 30
  entusiasmoWeight: number;  // 30
  penaltyOrder: "BEFORE_AVERAGE" | "AFTER_AVERAGE";
  galaWeight: number;    // 34
  casualWeight: number;  // 33
  tipicaWeight: number;  // 33
  porteWeight: number;        // 25
  carismaWeight: number;      // 25
  autenticidadWeight: number; // 25
  originalidadWeight: number; // 25
  scoringRule: "MEAN" | "TRIMMED_MEAN";
  decimals: number;
  jurorsModuleA: number;
  jurorsModuleB: number;
  tieBreakOrder: string[];
}

interface AdminPortalClientProps {
  adminName: string;
  edition: AdminEditionData;
  fraternities: AdminFraternityOption[];
  groups: AdminGroupItem[];
  candidates: AdminCandidateItem[];
  recentAudits: AdminAuditItem[];
  hasSubmittedVotes: boolean;
  initialConfigs?: AdminConfigData;
}

export default function AdminPortalClient({
  adminName,
  edition: initialEdition,
  fraternities: initialFraternities,
  groups: initialGroups,
  candidates: initialCandidates,
  recentAudits,
  hasSubmittedVotes,
  initialConfigs,
}: AdminPortalClientProps) {
  const edition = initialEdition;
  const [candidates, setCandidates] = useState(initialCandidates);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [groups, setGroups] = useState<AdminGroupItem[]>(initialGroups);
  const [fraternities, setFraternities] = useState<AdminFraternityOption[]>(initialFraternities);
  const [activeTab, setActiveTab] = useState<"groups" | "penalties" | "config" | "results" | "audit">("groups");
  const [isPending, startTransition] = useTransition();

  // Modal de registro/edición de grupo de danza
  const [danceModal, setDanceModal] = useState<{
    isOpen: boolean;
    initial: DanceGroupFormData | null;
  }>({ isOpen: false, initial: null });

  // Modal de foto de candidata
  const [candidatePhotoModal, setCandidatePhotoModal] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    photoUrl: string | null;
  }>({ isOpen: false, candidateId: "", candidateName: "", photoUrl: null });

  // Results tab sub-state: Concurso A vs Concurso B
  const [resultsContest, setResultsContest] = useState<"danzas" | "candidatas">("danzas");
  const [resultsCategorySlug, setResultsCategorySlug] = useState<"moperita" | "nusta">("moperita");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
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

  // Configuración editable completa (los 7 parámetros de la sección 5 del reglamento)
  const [configForm, setConfigForm] = useState<AdminConfigData>({
    coreografiaWeight: initialConfigs?.coreografiaWeight ?? 40,
    vestimentaWeight: initialConfigs?.vestimentaWeight ?? 30,
    entusiasmoWeight: initialConfigs?.entusiasmoWeight ?? 30,
    penaltyOrder: initialConfigs?.penaltyOrder ?? "AFTER_AVERAGE",
    galaWeight: initialConfigs?.galaWeight ?? 34,
    casualWeight: initialConfigs?.casualWeight ?? 33,
    tipicaWeight: initialConfigs?.tipicaWeight ?? 33,
    porteWeight: initialConfigs?.porteWeight ?? 25,
    carismaWeight: initialConfigs?.carismaWeight ?? 25,
    autenticidadWeight: initialConfigs?.autenticidadWeight ?? 25,
    originalidadWeight: initialConfigs?.originalidadWeight ?? 25,
    scoringRule: initialConfigs?.scoringRule ?? edition.scoringRule ?? "MEAN",
    decimals: initialConfigs?.decimals ?? edition.decimals ?? 2,
    jurorsModuleA: initialConfigs?.jurorsModuleA ?? 5,
    jurorsModuleB: initialConfigs?.jurorsModuleB ?? 5,
    tieBreakOrder: initialConfigs?.tieBreakOrder ?? ["coreografia", "vestimenta", "entusiasmo"],
  });

  // Registrar/editar grupo de danza (modal)
  const handleDanceSaved = (result: { group?: DanceGroupFormData & { id: string }; fraternities: AdminFraternityOption[] }) => {
    setFraternities(result.fraternities);

    if (result.group && danceModal.initial?.id) {
      // Edit: actualizar el grupo local
      const saved = result.group;
      setGroups((prev) =>
        prev.map((g) =>
          g.id === saved.id
            ? {
                ...g,
                danceName: saved.danceName,
                photoUrl: saved.photoUrl,
                fraternityId: saved.fraternityId,
                fraternityName:
                  result.fraternities.find((f) => f.id === saved.fraternityId)?.name ?? g.fraternityName,
                numberOfDancers: saved.numberOfDancers,
                entryOrder: saved.entryOrder,
                hasCaratula: saved.hasCaratula,
                hasMonografia: saved.hasMonografia,
                hasDancerList: saved.hasDancerList,
                hasInvitation: saved.hasInvitation,
              }
            : g
        )
      );
      showFeedback("success", "Grupo actualizado y registrado en auditoría");
    } else if (result.group) {
      // Create: agregar el grupo local al frente
      const saved = result.group;
      const fr = result.fraternities.find((f) => f.id === saved.fraternityId);
      setGroups((prev) => [
        {
          id: saved.id,
          entryOrder: saved.entryOrder,
          danceName: saved.danceName,
          photoUrl: saved.photoUrl,
          fraternityId: saved.fraternityId,
          fraternityName: fr?.name ?? "",
          university: fr?.university ?? "",
          department: fr?.department ?? "",
          numberOfDancers: saved.numberOfDancers,
          hasCaratula: saved.hasCaratula,
          hasMonografia: saved.hasMonografia,
          hasDancerList: saved.hasDancerList,
          hasInvitation: saved.hasInvitation,
          status: "PENDING" as const,
          isDisqualified: false,
          disqualifyReason: null,
          arrivalTime: null,
          votesCount: 0,
          penalties: [],
        },
        ...prev,
      ]);
      showFeedback("success", "Danza registrada. Ya aparece en el jurado y en control.");
      setActiveTab("groups");
    }
    setDanceModal({ isOpen: false, initial: null });
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
        showFeedback("success", "Grupo descalificado conforme al reglamento");
      } else {
        showFeedback("error", res.error || "Error al descalificar grupo");
      }
    });
  };

  // Anular penalización
  const handleVoidPenalty = () => {
    if (!voidPenaltyModal.reason.trim()) {
      showFeedback("error", "El motivo de anulación es obligatorio para auditoría");
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
        showFeedback("success", "Penalización anulada y registrada en auditoría");
      } else {
        showFeedback("error", res.error || "Error al anular penalización");
      }
    });
  };

  // Guardar configuración completa (los 7 parámetros)
  const handleSaveConfig = () => {
    // 1. Validar suma de danza (debe ser 100%)
    const sumA =
      configForm.coreografiaWeight + configForm.vestimentaWeight + configForm.entusiasmoWeight;
    if (sumA !== 100) {
      showFeedback("error", `Los pesos de la Entrada Folklórica deben sumar 100%. Suma actual: ${sumA}%`);
      return;
    }

    // 2. Validar suma de 3 pasadas (debe ser 100%)
    const sumPasadas = configForm.galaWeight + configForm.casualWeight + configForm.tipicaWeight;
    if (sumPasadas !== 100) {
      showFeedback("error", `Los pesos de las 3 pasadas deben sumar 100%. Suma actual: ${sumPasadas}%`);
      return;
    }

    // 3. Validar suma de 4 criterios de Moperita (debe ser 100%)
    const sumCriteriosB =
      configForm.porteWeight + configForm.carismaWeight + configForm.autenticidadWeight + configForm.originalidadWeight;
    if (sumCriteriosB !== 100) {
      showFeedback("error", `Los pesos de los 4 criterios de Moperita/Ñusta deben sumar 100%. Suma actual: ${sumCriteriosB}%`);
      return;
    }

    startTransition(async () => {
      const res = await saveAllEventConfigsAction({
        editionId: edition.id,
        moduleAWeights: {
          coreografia: configForm.coreografiaWeight,
          vestimenta: configForm.vestimentaWeight,
          entusiasmo: configForm.entusiasmoWeight,
        },
        penaltyOrder: configForm.penaltyOrder,
        moduleBCriteriaWeights: {
          porteElegancia: configForm.porteWeight,
          carismaSimpatia: configForm.carismaWeight,
          autenticidadTraje: configForm.autenticidadWeight,
          originalidadEstilo: configForm.originalidadWeight,
        },
        moduleBRunwayWeights: {
          GALA: configForm.galaWeight,
          CASUAL: configForm.casualWeight,
          TIPICA: configForm.tipicaWeight,
        },
        scoringRule: configForm.scoringRule,
        decimals: Number(configForm.decimals),
        juryCount: {
          moduleA: Number(configForm.jurorsModuleA),
          moduleB: Number(configForm.jurorsModuleB),
        },
        tieBreakOrder: configForm.tieBreakOrder,
      });

      if (res.success) {
        showFeedback("success", "Todos los parámetros oficiales fueron guardados y registrados en auditoría.");
      } else {
        showFeedback("error", res.error || "Error al guardar la configuración");
      }
    });
  };

  // Exportar Excel (incluyendo ambas hojas: Danzas y Candidatas)
  const handleExportExcel = () => {
    const exportDance = groups.map((g, idx) => ({
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

    const exportCandidates = candidates.map((c) => ({
      puesto: c.rank ? `${c.rank}.º` : "Pendiente",
      candidata: c.fullName,
      categoria: c.categoryName,
      fraternidad: `${c.fraternityName} (${c.university})`,
      pasarelaGala: c.galaAverage || 0,
      pasarelaCasual: c.casualAverage || 0,
      pasarelaTipica: c.tipicaAverage || 0,
      notaFinal: c.totalScore || 0,
    }));

    exportResultsToExcel({
      editionName: edition.name,
      danceGroups: exportDance,
      candidates: exportCandidates,
      filename: `Resultados_Oficiales_${edition.name.replace(/\s+/g, "_")}.xlsx`,
    });
  };

  // Candidatas filtradas para la pestaña de resultados
  const filteredCandidates = candidates.filter((c) => c.categorySlug === resultsCategorySlug);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Comité Organizador • ADMIN
            </span>
            <span className="text-xs text-slate-400">{adminName}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{edition.name}</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Panel de control general, auditoría y evaluación de los dos certámenes oficiales (Moperita y Entrada Folklórica).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/vivo"
            className="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <span>📺</span>
            <span>Pantalla en vivo</span>
          </Link>
          <Link
            href="/resultados"
            className="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <span>🌐</span>
            <span>Resultados públicos</span>
          </Link>
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

      {/* Tabs Principales */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:flex lg:flex-wrap gap-2 border-b border-slate-800 pb-2">
        {[
          { id: "groups", label: `Grupos de Danza (${groups.length})` },
          { id: "penalties", label: "Penalizaciones y Sanciones" },
          { id: "config", label: "⚙️ Parámetros Configurables (Reglamento)" },
          { id: "results", label: "🏆 Resultados y Rankings Oficiales" },
          { id: "audit", label: `Auditoría (${recentAudits.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GRUPOS DE DANZA */}
      {activeTab === "groups" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-lg font-bold text-white">Grupos de Danza Participantes</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">{groups.length} grupos registrados</span>
              <button
                onClick={() => setDanceModal({ isOpen: true, initial: null })}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-40 cursor-pointer"
              >
                <span>➕</span>
                <span>Registrar Danza</span>
              </button>
            </div>
          </div>

          <TableScroll>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Orden</th>
                  <th className="p-3">Foto</th>
                  <th className="p-3">Danza</th>
                  <th className="p-3">Fraternidad</th>
                  <th className="p-3">Universidad</th>
                  <th className="p-3 text-center">Bailarines</th>
                  <th className="p-3 text-center">Votos</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-amber-400 font-bold">
                      #{String(group.entryOrder || 0).padStart(2, "0")}
                    </td>
                    <td className="p-3">
                      {group.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={group.photoUrl}
                          alt={group.danceName}
                          className="w-11 h-8 object-cover rounded border border-slate-600 cursor-pointer hover:scale-125 transition-transform"
                          onClick={() =>
                            setDanceModal({
                              isOpen: true,
                              initial: {
                                id: group.id,
                                danceName: group.danceName,
                                photoUrl: group.photoUrl ?? null,
                                fraternityId: group.fraternityId,
                                numberOfDancers: group.numberOfDancers,
                                entryOrder: group.entryOrder,
                                hasCaratula: group.hasCaratula ?? false,
                                hasMonografia: group.hasMonografia ?? false,
                                hasDancerList: group.hasDancerList ?? false,
                                hasInvitation: group.hasInvitation ?? false,
                              },
                            })
                          }
                        />
                      ) : (
                        <button
                          onClick={() =>
                            setDanceModal({
                              isOpen: true,
                              initial: {
                                id: group.id,
                                danceName: group.danceName,
                                photoUrl: null,
                                fraternityId: group.fraternityId,
                                numberOfDancers: group.numberOfDancers,
                                entryOrder: group.entryOrder,
                                hasCaratula: group.hasCaratula ?? false,
                                hasMonografia: group.hasMonografia ?? false,
                                hasDancerList: group.hasDancerList ?? false,
                                hasInvitation: group.hasInvitation ?? false,
                              },
                            })
                          }
                          className="w-11 h-8 rounded border border-dashed border-slate-600 text-slate-500 hover:text-indigo-300 hover:border-indigo-400 text-sm"
                          title="Agregar foto"
                        >
                          📷
                        </button>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-white">{group.danceName}</td>
                    <td className="p-3">{group.fraternityName}</td>
                    <td className="p-3 text-slate-400">{group.university}</td>
                    <td className="p-3 text-center font-mono">{group.numberOfDancers}</td>
                    <td className="p-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-bold">
                        {group.votesCount}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {group.isDisqualified ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap align-middle px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                          DESCALIFICADO
                        </span>
                      ) : group.status === "IN_SCORING" ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap align-middle px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold animate-pulse">
                          EN PISTA
                        </span>
                      ) : group.status === "CLOSED" ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap align-middle px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          CERRADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center whitespace-nowrap align-middle px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                          PENDIENTE
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() =>
                          setDanceModal({
                            isOpen: true,
                            initial: {
                              id: group.id,
                              danceName: group.danceName,
                              photoUrl: group.photoUrl ?? null,
                              fraternityId: group.fraternityId,
                              numberOfDancers: group.numberOfDancers,
                              entryOrder: group.entryOrder,
                              // El checklist real se obtiene al editar desde BD; los botones
                              // permiten ajustarlo de inmediato en el modal
                              hasCaratula: group.hasCaratula ?? false,
                              hasMonografia: group.hasMonografia ?? false,
                              hasDancerList: group.hasDancerList ?? false,
                              hasInvitation: group.hasInvitation ?? false,
                            },
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[11px]"
                      >
                        Editar
                      </button>
                      {group.status === "PENDING" && !group.isDisqualified && (
                        <button
                          disabled={isPending}
                          onClick={() => handleChangeGroupStatus(group.id, "IN_SCORING")}
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px]"
                        >
                          Habilitar Voto
                        </button>
                      )}
                      {group.status === "IN_SCORING" && !group.isDisqualified && (
                        <button
                          disabled={isPending}
                          onClick={() => handleChangeGroupStatus(group.id, "CLOSED")}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[11px]"
                        >
                          Cerrar Voto
                        </button>
                      )}
                      {!group.isDisqualified && (
                        <button
                          onClick={() =>
                            setDisqualifyModal({
                              isOpen: true,
                              groupId: group.id,
                              groupName: `${group.danceName} (${group.fraternityName})`,
                              reason: "",
                            })
                          }
                          className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-[11px]"
                        >
                          Descalificar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}

      {/* TAB 2: PENALIZACIONES */}
      {activeTab === "penalties" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Historial de Penalizaciones</h2>
              <p className="text-xs text-slate-400">
                Sanciones registradas por el personal de Control. Las anulaciones quedan registradas en auditoría.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {groups
              .flatMap((g) => g.penalties.map((p) => ({ ...p, groupName: g.danceName, fraternity: g.fraternityName })))
              .map((penalty) => (
                <div
                  key={penalty.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                    penalty.isVoided
                      ? "bg-slate-950/40 border-slate-800/60 opacity-50"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          penalty.type === "YELLOW_FLAG"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : penalty.type === "RED_FLAG"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {penalty.type}
                      </span>
                      <span className="font-bold text-white text-xs">{penalty.groupName}</span>
                      <span className="text-slate-400 text-xs">({penalty.fraternity})</span>
                      {penalty.isVoided && (
                        <span className="text-[10px] bg-rose-950 text-rose-400 px-2 py-0.5 rounded font-bold">
                          ANULADA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {penalty.observation || "Sin observación"} &bull;{" "}
                      <span className="font-mono text-slate-500">
                        {new Date(penalty.registeredAt).toLocaleTimeString("es-BO")}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      −{penalty.points} pts
                    </span>
                    {!penalty.isVoided && (
                      <button
                        onClick={() =>
                          setVoidPenaltyModal({
                            isOpen: true,
                            penaltyId: penalty.id,
                            groupName: `${penalty.groupName} (${penalty.type})`,
                            reason: "",
                          })
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        Anular
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN OFICIAL (SECCIÓN 5 DEL REGLAMENTO) */}
      {activeTab === "config" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                Reglamento Oficial 2026 &bull; Sección 5
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Parámetros Configurables de Evaluación</h2>
            <p className="text-xs text-slate-400 mt-1">
              Todos los puntos que el reglamento no define como valores fijos se configuran aquí. Ningún valor está hardcodeado. Los cambios se registran inmutablemente en el libro de auditoría.
              {hasSubmittedVotes && (
                <span className="text-amber-400 block mt-1 font-semibold">
                  ⚠️ Ya existen calificaciones emitidas. Toda actualización recalcula de inmediato los rankings en vivo y queda firmada en auditoría.
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* SECCIÓN 1: CONCURSO B — ENTRADA FOLKLÓRICA */}
            <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🎭</span>
                  <span>Concurso B: Entrada Folklórica (Danzas)</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Reglamento: 0–100 pts</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-medium">Ponderación de los 3 Criterios Oficiales:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Coreografía (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.coreografiaWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, coreografiaWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Defecto: 40%</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Vestimenta (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.vestimentaWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, vestimentaWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Defecto: 30%</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Entusiasmo (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.entusiasmoWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, entusiasmoWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Defecto: 30%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-1">
                  <span className="text-slate-400">Suma requerida: 100%</span>
                  <span
                    className={
                      configForm.coreografiaWeight + configForm.vestimentaWeight + configForm.entusiasmoWeight === 100
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    Suma actual: {configForm.coreografiaWeight + configForm.vestimentaWeight + configForm.entusiasmoWeight}%
                  </span>
                </div>
              </div>

              {/* Orden de aplicación de penalizaciones */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Orden de Aplicación de Penalizaciones:
                </label>
                <select
                  value={configForm.penaltyOrder}
                  onChange={(e) =>
                    setConfigForm((p) => ({
                      ...p,
                      penaltyOrder: e.target.value as "BEFORE_AVERAGE" | "AFTER_AVERAGE",
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="AFTER_AVERAGE">
                    Después de promediar las notas de los jurados (Recomendado / Estándar)
                  </option>
                  <option value="BEFORE_AVERAGE">
                    Antes de promediar (se descuenta a la nota de cada jurado acotando en 0)
                  </option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Reglamento 3.2: 3 amarillas = −5 pts; roja = −10 pts; orden = −5 pts.
                </p>
              </div>
            </div>

            {/* SECCIÓN 2: CONCURSO A — MOPERITA Y ÑUSTA DE BOLIVIA */}
            <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>👑</span>
                  <span>Concurso A: Moperita y Ñusta de Bolivia</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">3 pasadas &bull; 4 criterios</span>
              </div>

              {/* Ponderación de las 3 Pasadas */}
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-medium">Ponderación de las 3 Pasadas Obligatorias:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Ropa de Gala (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.galaWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, galaWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Ropa Casual (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.casualWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, casualWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Ropa Típica (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.tipicaWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, tipicaWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-1">
                  <span className="text-slate-400">Suma requerida: 100%</span>
                  <span
                    className={
                      configForm.galaWeight + configForm.casualWeight + configForm.tipicaWeight === 100
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    Suma actual: {configForm.galaWeight + configForm.casualWeight + configForm.tipicaWeight}%
                  </span>
                </div>
              </div>

              {/* Ponderación de los 4 Criterios */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-300 font-medium">Ponderación de los 4 Criterios de Evaluación:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 truncate" title="Porte y elegancia">
                      1. Porte y Elegancia (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.porteWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, porteWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 truncate" title="Carisma y simpatía">
                      2. Carisma y Simpatía (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.carismaWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, carismaWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 truncate" title="Autenticidad traje típico">
                      3. Autenticidad Típica (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.autenticidadWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, autenticidadWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 truncate" title="Originalidad y estilo casual">
                      4. Originalidad Casual (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configForm.originalidadWeight}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, originalidadWeight: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-1">
                  <span className="text-slate-400">Suma requerida: 100%</span>
                  <span
                    className={
                      configForm.porteWeight +
                        configForm.carismaWeight +
                        configForm.autenticidadWeight +
                        configForm.originalidadWeight ===
                      100
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    Suma actual:{" "}
                    {configForm.porteWeight +
                      configForm.carismaWeight +
                      configForm.autenticidadWeight +
                      configForm.originalidadWeight}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: REGLAS GENERALES Y DESEMPATE */}
            <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-4 xl:col-span-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                <span>⚙️</span>
                <span>Reglas Generales de Calificación y Escrutinio</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Método de Agregación:
                  </label>
                  <select
                    value={configForm.scoringRule}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        scoringRule: e.target.value as "MEAN" | "TRIMMED_MEAN",
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="MEAN">Promedio Simple (MEAN - Recomendado)</option>
                    <option value="TRIMMED_MEAN">Promedio Recortado (descarta máx y mín)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Redondeo de Decimales:
                  </label>
                  <select
                    value={configForm.decimals}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        decimals: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={0}>0 decimales (ej. 85)</option>
                    <option value={1}>1 decimal (ej. 85.3)</option>
                    <option value={2}>2 decimales (ej. 85.33 - Estándar)</option>
                    <option value={3}>3 decimales (ej. 85.333)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jurados Entrada (Mod. A):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={configForm.jurorsModuleA}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        jurorsModuleA: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jurados Moperita (Mod. B):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={configForm.jurorsModuleB}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        jurorsModuleB: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Criterio de desempate */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Criterio de Desempate (Prioridad en orden descendente):
                </label>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    1.º Mayor nota en Coreografía
                  </span>
                  <span className="text-slate-500">&gt;</span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    2.º Mayor nota en Vestimenta
                  </span>
                  <span className="text-slate-500">&gt;</span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    3.º Menor cantidad de penalizaciones
                  </span>
                  <span className="text-slate-500">&gt;</span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    4.º Orden de ingreso original
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              disabled={isPending}
              onClick={handleSaveConfig}
              className="px-6 py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span>💾</span>
              <span>{isPending ? "Guardando..." : "Guardar Configuración Oficial del Comité"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: RESULTADOS OFICIALES Y RANKING */}
      {activeTab === "results" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Resultados Oficiales de los Concursos</h2>
              <p className="text-xs text-slate-400">
                Los dos concursos tienen cómputo y proclamación completamente separados.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>📊</span>
              <span>Exportar Ambos Concursos a Excel (.xlsx)</span>
            </button>
          </div>

          {/* Selector de Concurso */}
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setResultsContest("danzas")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                resultsContest === "danzas"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              🎭 Concurso B: Entrada Folklórica ({groups.length} grupos)
            </button>
            <button
              onClick={() => setResultsContest("candidatas")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                resultsContest === "candidatas"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              👑 Concurso A: Moperita y Ñusta de Bolivia ({candidates.length} candidatas)
            </button>
          </div>

          {/* VISTA CONCURSO B: DANZAS */}
          {resultsContest === "danzas" && (
            <div className="space-y-4">
              <TableScroll>
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
                    {groups.map((group, idx) => (
                      <tr key={group.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-amber-400">
                          {idx === 0 && "🥇 1.º Lugar"}
                          {idx === 1 && "🥈 2.º Lugar"}
                          {idx === 2 && "🥉 3.º Lugar"}
                          {idx > 2 && `${idx + 1}.º`}
                        </td>
                        <td className="p-3 font-semibold text-white">{group.danceName}</td>
                        <td className="p-3">
                          {group.fraternityName} &bull;{" "}
                          <span className="text-slate-400">{group.university}</span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {group.averageScore !== undefined ? group.averageScore.toFixed(configForm.decimals) : "0.00"}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-400">
                          {group.penaltiesTotal ? `−${group.penaltiesTotal}` : "0"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white text-sm">
                          {group.finalScore !== undefined ? group.finalScore.toFixed(configForm.decimals) : "0.00"}
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
              </TableScroll>
            </div>
          )}

          {/* VISTA CONCURSO A: CANDIDATAS */}
          {resultsContest === "candidatas" && (
            <div className="space-y-4">
              {/* Sub-selector de categoría */}
              <div className="flex gap-2">
                <button
                  onClick={() => setResultsCategorySlug("moperita")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsCategorySlug === "moperita"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  🌿 Moperita de Bolivia ({candidates.filter((c) => c.categorySlug === "moperita").length})
                </button>
                <button
                  onClick={() => setResultsCategorySlug("nusta")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsCategorySlug === "nusta"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  👑 Ñusta de Bolivia ({candidates.filter((c) => c.categorySlug === "nusta").length})
                </button>
              </div>

              <TableScroll>
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Puesto</th>
                      <th className="p-3">Candidata</th>
                      <th className="p-3">Fraternidad / Universidad</th>
                      <th className="p-3 text-right">Gala ({configForm.galaWeight}%)</th>
                      <th className="p-3 text-right">Casual ({configForm.casualWeight}%)</th>
                      <th className="p-3 text-right">Típica ({configForm.tipicaWeight}%)</th>
                      <th className="p-3 text-center">Votos</th>
                      <th className="p-3 text-right font-bold text-white">Nota Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-amber-400">
                          {c.rank === 1 && "👑 Ganadora"}
                          {c.rank === 2 && "🥈 2.ª"}
                          {c.rank === 3 && "🥉 3.ª"}
                          {c.rank && c.rank > 3 && `${c.rank}.ª`}
                          {!c.rank && "—"}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <button type="button" className="flex items-center gap-2 text-left" title="Cambiar fotografía"
                            onClick={() => setCandidatePhotoModal({ isOpen: true, candidateId: c.id, candidateName: c.fullName, photoUrl: c.photoUrl })}>
                            {c.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.photoUrl} alt={c.fullName} className="w-10 h-12 rounded object-cover" />
                            ) : <span aria-hidden="true">📷</span>}
                            <span>{c.fullName}<span className="block text-indigo-300 text-[11px]">Cambiar foto</span></span>
                          </button>
                        </td>
                        <td className="p-3">
                          {c.fraternityName} &bull;{" "}
                          <span className="text-slate-400">{c.university}</span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {c.galaAverage !== undefined ? c.galaAverage.toFixed(configForm.decimals) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {c.casualAverage !== undefined ? c.casualAverage.toFixed(configForm.decimals) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {c.tipicaAverage !== undefined ? c.tipicaAverage.toFixed(configForm.decimals) : "—"}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-bold">
                            {c.votesCount}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white text-sm">
                          {c.totalScore !== undefined ? c.totalScore.toFixed(configForm.decimals) : "0.00"}
                        </td>
                      </tr>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No hay candidatas registradas en esta categoría.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableScroll>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDITORÍA */}
      {activeTab === "audit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-xl font-bold text-white">Registro Inmutable de Auditoría</h2>
            <span className="text-xs text-slate-400">{recentAudits.length} eventos recientes</span>
          </div>
          <div className="space-y-2">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs"
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

      {danceModal.isOpen && (
        <DanceRegistrationModal editionId={edition.id} fraternities={fraternities}
          initial={danceModal.initial} onClose={() => setDanceModal({ isOpen: false, initial: null })}
          onSaved={handleDanceSaved} onFraternitiesChanged={setFraternities} />
      )}

      {candidatePhotoModal.isOpen && (
        <div className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80" role="dialog" aria-modal="true" aria-label="Foto de candidata">
          <div className="app-dialog-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Foto de {candidatePhotoModal.candidateName}</h3>
            <PhotoUpload value={candidatePhotoModal.photoUrl} disabled={isPending} onBusyChange={setPhotoBusy}
              onChange={(photoUrl) => setCandidatePhotoModal((prev) => ({ ...prev, photoUrl }))} />
            <div className="flex justify-end gap-3">
              <button type="button" disabled={isPending || photoBusy} onClick={() => setCandidatePhotoModal((prev) => ({ ...prev, isOpen: false }))}>Cancelar</button>
              <button type="button" disabled={isPending || photoBusy} className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50"
                onClick={() => startTransition(async () => {
                  try {
                    const res = await setParticipantPhotoAction({ participantId: candidatePhotoModal.candidateId, photoUrl: candidatePhotoModal.photoUrl });
                    if (!res.success) { showFeedback("error", res.error || "No se pudo guardar la fotografía"); return; }
                    setCandidates((prev) => prev.map((c) => c.id === candidatePhotoModal.candidateId ? { ...c, photoUrl: candidatePhotoModal.photoUrl } : c));
                    setCandidatePhotoModal((prev) => ({ ...prev, isOpen: false }));
                    showFeedback("success", "Fotografía actualizada");
                  } catch { showFeedback("error", "No se pudo guardar. Revisa tu conexión."); }
                })}>{isPending ? "Guardando…" : "Guardar foto"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESCALIFICACIÓN */}
      {disqualifyModal.isOpen && (
        <div className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="app-dialog-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
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
                className="px-4 py-2 rounded-xl text-xs text-slate-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={isPending || !disqualifyModal.reason.trim()}
                onClick={handleDisqualify}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 cursor-pointer"
              >
                Confirmar Descalificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANULAR PENALIZACIÓN */}
      {voidPenaltyModal.isOpen && (
        <div className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="app-dialog-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
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
                className="px-4 py-2 rounded-xl text-xs text-slate-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={isPending || !voidPenaltyModal.reason.trim()}
                onClick={handleVoidPenalty}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 cursor-pointer"
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
