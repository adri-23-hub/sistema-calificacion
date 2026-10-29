"use client";

import { useState, useTransition } from "react";
import { registerPenaltyAction, registerArrivalAction, changeGroupStatusAction } from "@/features/danza/actions";

export interface DanceGroupControlItem {
  id: string;
  entryOrder: number | null;
  danceName: string;
  fraternityName: string;
  university: string;
  department: string;
  numberOfDancers: number;
  status: "PENDING" | "IN_SCORING" | "CLOSED";
  arrivalTime: string | null;
  arrivalRegisteredBy: string | null;
  isDisqualified: boolean;
  disqualifyReason: string | null;
  hasCaratula: boolean;
  hasMonografia: boolean;
  hasDancerList: boolean;
  hasInvitation: boolean;
  penalties: Array<{
    id: string;
    type: "YELLOW_FLAG" | "RED_FLAG" | "ORDER_VIOLATION" | "MANUAL_DEDUCTION" | "DISQUALIFICATION";
    points: number;
    observation: string | null;
    registeredAt: string;
    registeredBy: string;
    isVoided: boolean;
  }>;
}

interface ControlPortalClientProps {
  userName: string;
  userCode: string;
  groups: DanceGroupControlItem[];
}

export default function ControlPortalClient({
  userName,
  userCode,
  groups: initialGroups,
}: ControlPortalClientProps) {
  const [groups, setGroups] = useState<DanceGroupControlItem[]>(initialGroups);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending_arrival" | "arrived" | "penalized">("all");
  const [isPending, startTransition] = useTransition();

  // Modal de penalización
  const [penaltyModal, setPenaltyModal] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
    type: "YELLOW_FLAG" | "RED_FLAG" | "ORDER_VIOLATION" | "MANUAL_DEDUCTION";
    points: number;
    observation: string;
  }>({
    isOpen: false,
    groupId: "",
    groupName: "",
    type: "YELLOW_FLAG",
    points: 0,
    observation: "",
  });

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filtrado de grupos
  const filteredGroups = groups.filter((g) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        g.danceName.toLowerCase().includes(q) ||
        g.fraternityName.toLowerCase().includes(q) ||
        g.university.toLowerCase().includes(q) ||
        (g.entryOrder?.toString() === q);
      if (!match) return false;
    }
    if (filter === "pending_arrival") return !g.arrivalTime;
    if (filter === "arrived") return !!g.arrivalTime;
    if (filter === "penalized") return g.penalties.some((p) => !p.isVoided);
    return true;
  });

  // Manejo de registro de llegada
  const handleRegisterArrival = (groupId: string) => {
    startTransition(async () => {
      const res = await registerArrivalAction({ danceGroupId: groupId });
      if (res.success) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, arrivalTime: new Date().toISOString(), arrivalRegisteredBy: userCode }
              : g
          )
        );
        showFeedback("success", "Hora de llegada registrada correctamente");
      } else {
        showFeedback("error", res.error || "Error al registrar llegada");
      }
    });
  };

  // Abrir modal de penalización
  const openPenaltyModal = (
    group: DanceGroupControlItem,
    type: "YELLOW_FLAG" | "RED_FLAG" | "ORDER_VIOLATION" | "MANUAL_DEDUCTION"
  ) => {
    let defaultObservation = "";
    let points = 0;
    if (type === "YELLOW_FLAG") {
      defaultObservation = "Retraso de 10 a 15 minutos en el ingreso.";
      points = 0; // Se calcula automáticamente por acumulación (cada 3 = 5 pts)
    } else if (type === "RED_FLAG") {
      defaultObservation = "Retraso mayor a 15 minutos o indisciplina.";
      points = 10;
    } else if (type === "ORDER_VIOLATION") {
      defaultObservation = "Incumplió el orden de ingreso sorteado.";
      points = 5;
    } else if (type === "MANUAL_DEDUCTION") {
      defaultObservation = "Sanción por bailarines ebrios o consumo de bebidas alcohólicas.";
      points = 10;
    }

    setPenaltyModal({
      isOpen: true,
      groupId: group.id,
      groupName: `${group.entryOrder ? `#${group.entryOrder} ` : ""}${group.danceName} (${group.fraternityName})`,
      type,
      points,
      observation: defaultObservation,
    });
  };

  // Confirmar registro de penalización
  const handleSubmitPenalty = () => {
    if (!penaltyModal.observation.trim()) {
      showFeedback("error", "La observación es obligatoria para registrar una penalización");
      return;
    }

    startTransition(async () => {
      const res = await registerPenaltyAction({
        danceGroupId: penaltyModal.groupId,
        type: penaltyModal.type,
        points: penaltyModal.points,
        observation: penaltyModal.observation,
      });

      if (res.success && res.penaltyId) {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === penaltyModal.groupId) {
              return {
                ...g,
                penalties: [
                  ...g.penalties,
                  {
                    id: res.penaltyId!,
                    type: penaltyModal.type,
                    points: penaltyModal.points,
                    observation: penaltyModal.observation,
                    registeredAt: new Date().toISOString(),
                    registeredBy: userCode,
                    isVoided: false,
                  },
                ],
              };
            }
            return g;
          })
        );
        setPenaltyModal((prev) => ({ ...prev, isOpen: false }));
        showFeedback("success", "Penalización registrada en auditoría");
      } else {
        showFeedback("error", res.error || "Error al registrar penalización");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Personal de Control de Campo
            </span>
            <span className="text-xs text-slate-400 font-mono">Código: {userCode}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Control de Entrada Folklórica 2026
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Registro en tiempo real de hora de llegada, orden de ingreso y banderolas de penalización.
          </p>
        </div>
        <div className="text-right flex items-center gap-3">
          <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700/50">
            <div className="text-xs text-slate-400">Operador</div>
            <div className="text-sm font-semibold text-white">{userName}</div>
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
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por danza, fraternidad, universidad o N.º de ingreso..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Todos ({groups.length})
          </button>
          <button
            onClick={() => setFilter("pending_arrival")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              filter === "pending_arrival"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Sin Llegada ({groups.filter((g) => !g.arrivalTime).length})
          </button>
          <button
            onClick={() => setFilter("arrived")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              filter === "arrived"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Llegaron ({groups.filter((g) => !!g.arrivalTime).length})
          </button>
          <button
            onClick={() => setFilter("penalized")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              filter === "penalized"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Con Penalización ({groups.filter((g) => g.penalties.some((p) => !p.isVoided)).length})
          </button>
        </div>
      </div>

      {/* Lista de grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => {
          const activePenalties = group.penalties.filter((p) => !p.isVoided);
          const yellowCount = activePenalties.filter((p) => p.type === "YELLOW_FLAG").length;
          const redCount = activePenalties.filter((p) => p.type === "RED_FLAG").length;
          const hasOrderViolation = activePenalties.some((p) => p.type === "ORDER_VIOLATION");
          const manualCount = activePenalties.filter((p) => p.type === "MANUAL_DEDUCTION").length;

          return (
            <div
              key={group.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                group.isDisqualified
                  ? "border-rose-700/50 bg-rose-950/20"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm">
                      {group.entryOrder || "—"}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {group.danceName}
                      </h3>
                      <p className="text-xs text-slate-400 leading-tight">
                        {group.fraternityName}
                      </p>
                    </div>
                  </div>
                  {group.isDisqualified && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      DESCALIFICADO
                    </span>
                  )}
                </div>

                {/* Info institucional */}
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Universidad:</span>
                    <span className="font-medium text-slate-200 text-right truncate max-w-[200px]">
                      {group.university}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bailarines:</span>
                    <span
                      className={`font-semibold ${
                        group.numberOfDancers < 50 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {group.numberOfDancers}{" "}
                      {group.numberOfDancers < 50 && "(Alerta: mín. 50)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Llegada:</span>
                    {group.arrivalTime ? (
                      <span className="text-emerald-400 font-mono font-medium">
                        ✓ {new Date(group.arrivalTime).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <button
                        disabled={isPending || group.isDisqualified}
                        onClick={() => handleRegisterArrival(group.id)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50"
                      >
                        Registrar Llegada
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumen de banderolas y penalizaciones */}
                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Penalizaciones Registradas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        yellowCount > 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      🟡 {yellowCount} Amarilla{yellowCount !== 1 ? "s" : ""}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        redCount > 0
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      🔴 {redCount} Roja{redCount !== 1 ? "s" : ""}
                    </span>
                    {hasOrderViolation && (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        ⚠️ Orden incumplido (-5)
                      </span>
                    )}
                    {manualCount > 0 && (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                        🍺 {manualCount} Sanción manual
                      </span>
                    )}
                    {activePenalties.length === 0 && (
                      <span className="text-xs text-slate-500 italic">
                        Sin penalizaciones
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botonera de acciones de control */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Aplicar Penalización
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isPending || group.isDisqualified}
                    onClick={() => openPenaltyModal(group, "YELLOW_FLAG")}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    🟡 Amarilla (+1)
                  </button>
                  <button
                    disabled={isPending || group.isDisqualified}
                    onClick={() => openPenaltyModal(group, "RED_FLAG")}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    🔴 Roja (+1)
                  </button>
                  <button
                    disabled={isPending || group.isDisqualified || hasOrderViolation}
                    onClick={() => openPenaltyModal(group, "ORDER_VIOLATION")}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    ⚠️ Orden (-5)
                  </button>
                  <button
                    disabled={isPending || group.isDisqualified}
                    onClick={() => openPenaltyModal(group, "MANUAL_DEDUCTION")}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    🍺 Sanción
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación de penalización */}
      {penaltyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {penaltyModal.type === "YELLOW_FLAG" && "Banderola Amarilla (Retraso 10-15 min)"}
                  {penaltyModal.type === "RED_FLAG" && "Banderola Roja (Retraso >15 min / Indisciplina)"}
                  {penaltyModal.type === "ORDER_VIOLATION" && "Incumplimiento de Orden de Ingreso"}
                  {penaltyModal.type === "MANUAL_DEDUCTION" && "Sanción Manual (Bailarines ebrios o alcohol)"}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  {penaltyModal.groupName}
                </h3>
              </div>
              <button
                onClick={() => setPenaltyModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Puntos de sanción manual */}
            {penaltyModal.type === "MANUAL_DEDUCTION" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Puntos a descontar:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={penaltyModal.points}
                  onChange={(e) =>
                    setPenaltyModal((prev) => ({ ...prev, points: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            )}

            {/* Observación obligatoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observación / Motivo (obligatorio para auditoría):
              </label>
              <textarea
                rows={3}
                value={penaltyModal.observation}
                onChange={(e) =>
                  setPenaltyModal((prev) => ({ ...prev, observation: e.target.value }))
                }
                placeholder="Detalle de la falta, hora exacta y ubicación..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPenaltyModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                disabled={isPending || !penaltyModal.observation.trim()}
                onClick={handleSubmitPenalty}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isPending ? "Registrando..." : "Confirmar y Guardar en Auditoría"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
