"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitDanceScoreAction } from "@/features/danza/actions";
import Link from "next/link";

export interface DanceGroupDetail {
  id: string;
  entryOrder: number | null;
  danceName: string;
  fraternityName: string;
  university: string;
  city: string;
  department: string;
  numberOfDancers: number;
  status: "PENDING" | "IN_SCORING" | "CLOSED";
  isDisqualified: boolean;
  hasCaratula: boolean;
  hasMonografia: boolean;
  hasDancerList: boolean;
  hasInvitation: boolean;
  userScore: {
    coreografia: number;
    vestimenta: number;
    entusiasmo: number;
    rawTotal: number;
    observations: string | null;
    submittedAt: string;
    payloadHash: string | null;
  } | null;
}

interface DanceScoringClientProps {
  juryName: string;
  juryCode: string;
  group: DanceGroupDetail;
}

export default function DanceScoringClient({
  juryName,
  juryCode,
  group,
}: DanceScoringClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Valores de los 3 criterios (1 a 100)
  const [coreografia, setCoreografia] = useState<number>(group.userScore?.coreografia || 80);
  const [vestimenta, setVestimenta] = useState<number>(group.userScore?.vestimenta || 80);
  const [entusiasmo, setEntusiasmo] = useState<number>(group.userScore?.entusiasmo || 80);
  const [observations, setObservations] = useState<string>(group.userScore?.observations || "");

  // Modal de confirmación de voto único
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(!!group.userScore);

  // Cálculo en vivo
  const rawTotal = Math.round((coreografia * 0.40 + vestimenta * 0.30 + entusiasmo * 0.30) * 100) / 100;

  const handleSubmit = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const clientUuid = crypto.randomUUID();
      const res = await submitDanceScoreAction({
        danceGroupId: group.id,
        coreografia,
        vestimenta,
        entusiasmo,
        observations: observations.trim() || undefined,
        clientUuid,
      });

      if (res.success) {
        setSubmitted(true);
        setShowConfirmModal(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Ocurrió un error al enviar la calificación.");
        setShowConfirmModal(false);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Botón Volver */}
      <div>
        <Link
          href="/jurado"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          ← Volver a la Lista de Danzas
        </Link>
      </div>

      {/* Tarjeta de Información del Grupo */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold flex items-center justify-center text-lg">
              #{group.entryOrder || "—"}
            </span>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                MÓDULO A • ENTRADA FOLKLÓRICA
              </span>
              <h1 className="text-2xl font-bold text-white mt-0.5">{group.danceName}</h1>
              <p className="text-sm text-slate-400">{group.fraternityName}</p>
            </div>
          </div>

          {/* Estado */}
          <div>
            {submitted ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span>🔒</span>
                <span>VOTO BLOQUEADO (ENVIADO)</span>
              </span>
            ) : group.isDisqualified ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                DESCALIFICADO
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                EN CALIFICACIÓN
              </span>
            )}
          </div>
        </div>

        {/* Detalles institucionales y checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block">Universidad:</span>
            <span className="text-white font-medium">{group.university}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Origen:</span>
            <span className="text-white font-medium">{group.city}, {group.department}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Bailarines:</span>
            <span className={group.numberOfDancers < 50 ? "text-amber-400 font-bold" : "text-emerald-400 font-medium"}>
              {group.numberOfDancers} {group.numberOfDancers < 50 && "(Alerta: mín. 50)"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Checklist:</span>
            <span className="text-emerald-400 font-medium">✓ Acreditado</span>
          </div>
        </div>
      </div>

      {/* Alerta de Error */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* FORMULARIO DE CALIFICACIÓN O VISTA DE VOTO ENVIADO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            {submitted ? "Tu Calificación Emitida" : "Formulario de Calificación Oficial"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Escala reglamentaria de 1 a 100 puntos por criterio. Cada jurado vota una sola vez.
          </p>
        </div>

        {/* 3 Criterios */}
        <div className="space-y-6">
          {/* Criterio 1: Coreografía */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Criterio 1 • Peso 40%
                </span>
                <h3 className="font-bold text-white text-base">Coreografía</h3>
                <p className="text-xs text-slate-400">
                  Coordinación de pasos, figuras grupales, sincronización rítmica y desplazamiento escénico.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {coreografia}
                </span>
                <span className="text-xs text-slate-500 block">/ 100 pts</span>
              </div>
            </div>

            {!submitted && (
              <input
                type="range"
                min={1}
                max={100}
                value={coreografia}
                onChange={(e) => setCoreografia(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            )}
          </div>

          {/* Criterio 2: Vestimenta */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Criterio 2 • Peso 30%
                </span>
                <h3 className="font-bold text-white text-base">Vestimenta y Traje Folklórico</h3>
                <p className="text-xs text-slate-400">
                  Autenticidad cultural, confección artesanal, uniformidad, accesorios y respeto a las tradiciones.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {vestimenta}
                </span>
                <span className="text-xs text-slate-500 block">/ 100 pts</span>
              </div>
            </div>

            {!submitted && (
              <input
                type="range"
                min={1}
                max={100}
                value={vestimenta}
                onChange={(e) => setVestimenta(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            )}
          </div>

          {/* Criterio 3: Entusiasmo */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Criterio 3 • Peso 30%
                </span>
                <h3 className="font-bold text-white text-base">Entusiasmo y Expresión</h3>
                <p className="text-xs text-slate-400">
                  Fervor festivo, alegría, conexión con el público, energía y perseverancia durante el recorrido.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {entusiasmo}
                </span>
                <span className="text-xs text-slate-500 block">/ 100 pts</span>
              </div>
            </div>

            {!submitted && (
              <input
                type="range"
                min={1}
                max={100}
                value={entusiasmo}
                onChange={(e) => setEntusiasmo(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            )}
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Observaciones o Comentarios del Jurado (opcional):
          </label>
          <textarea
            disabled={submitted}
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Anotaciones cualitativas sobre la presentación..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-60"
          />
        </div>

        {/* Resumen Total y Botón de Envío */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-slate-400 block">Nota Total Calculada:</span>
            <div className="text-3xl font-black text-white font-mono">
              {rawTotal.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-400">
                = ({coreografia}×0.4) + ({vestimenta}×0.3) + ({entusiasmo}×0.3)
              </span>
            </div>
          </div>

          {!submitted ? (
            <button
              disabled={isPending || group.isDisqualified}
              onClick={() => setShowConfirmModal(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              Emitir Calificación Definitiva
            </button>
          ) : (
            <div className="text-right">
              <span className="text-xs text-emerald-400 font-mono font-bold block">
                ✓ Calificación Registrada e Inmutable
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {group.userScore?.payloadHash ? `Hash: ${group.userScore.payloadHash.slice(0, 20)}...` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE VOTO ÚNICO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">¿Confirmas el envío definitivo?</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Cada jurado vota <strong>UNA sola vez</strong> por grupo. Una vez enviada, tu calificación quedará
                bloqueada criptográficamente en la base de datos y <strong>no podrás editarla ni anularla</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Grupo:</span>
                <span className="text-white font-bold">{group.danceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coreografía (40%):</span>
                <span className="text-white font-mono">{coreografia} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vestimenta (30%):</span>
                <span className="text-white font-mono">{vestimenta} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entusiasmo (30%):</span>
                <span className="text-white font-mono">{entusiasmo} pts</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                <span className="text-amber-400">Nota Total:</span>
                <span className="text-amber-400 font-mono text-sm">{rawTotal.toFixed(2)} pts</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Revisar Calificación
              </button>
              <button
                disabled={isPending}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isPending ? "Enviando Voto..." : "Sí, Confirmar y Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
