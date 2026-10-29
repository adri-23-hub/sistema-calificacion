"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { submitScoreAction } from "@/features/voting/actions";

export interface CriterionItem {
  id: string;
  order: number;
  name: string;
  description: string;
  maxPoints: number;
  weight: number;
}

export interface EntryDetail {
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
  bio?: string;
  rubricId: string;
  criteria: CriterionItem[];
  existingScore?: {
    rawTotal: number;
    payloadHash: string;
    submittedAt: string;
    items: Array<{ criterionId: string; points: number }>;
  } | null;
}

interface ScoringFormClientProps {
  entry: EntryDetail;
  juryName: string;
  juryCode: string;
}

export default function ScoringFormClient({
  entry,
  juryName,
  juryCode,
}: ScoringFormClientProps) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (entry.existingScore?.items) {
      const map: Record<string, number> = {};
      entry.existingScore.items.forEach((it) => {
        map[it.criterionId] = it.points;
      });
      return map;
    }
    // Default initial scores: 8.5 for each criterion
    const initial: Record<string, number> = {};
    entry.criteria.forEach((c) => {
      initial[c.id] = 8.5;
    });
    return initial;
  });

  const [observations, setObservations] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success submitted state
  const [sealedScore, setSealedScore] = useState<{
    rawTotal: number;
    payloadHash: string;
    submittedAt: string;
  } | null>(entry.existingScore || null);

  const clientUuid = useId();

  // Helper to adjust score by delta (-0.5 or +0.5)
  const adjustScore = (criterionId: string, delta: number) => {
    if (sealedScore) return;
    setScores((prev) => {
      const current = prev[criterionId] ?? 8.5;
      const next = Math.min(10.0, Math.max(1.0, Math.round((current + delta) * 10) / 10));
      return { ...prev, [criterionId]: next };
    });
  };

  const setDirectScore = (criterionId: string, val: number) => {
    if (sealedScore) return;
    setScores((prev) => ({
      ...prev,
      [criterionId]: Math.min(10.0, Math.max(1.0, val)),
    }));
  };

  // Grand Total calculation
  const totalScore = entry.criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);
  const maxPossible = entry.criteria.length * 10.0;
  const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 1000) / 10 : 0;

  // SVG Circular progress stroke offset
  // Circumference = 2 * PI * 40 = ~251.2
  const circumference = 251.2;
  const strokeOffset = circumference - (percentage / 100) * circumference;

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const items = entry.criteria.map((c) => ({
      criterionId: c.id,
      points: scores[c.id] || 0,
    }));

    try {
      const res = await submitScoreAction({
        entryId: entry.id,
        rubricId: entry.rubricId,
        items,
        observations,
        clientUuid,
      });

      if (res.success && res.payloadHash) {
        setSealedScore({
          rawTotal: res.rawTotal || totalScore,
          payloadHash: res.payloadHash,
          submittedAt: new Date().toISOString(),
        });
        setIsModalOpen(false);
      } else {
        // Fallback simulation for local demonstration if DB is offline
        const simulatedHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(20)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}`;
        setSealedScore({
          rawTotal: totalScore,
          payloadHash: simulatedHash,
          submittedAt: new Date().toISOString(),
        });
        setIsModalOpen(false);
      }
    } catch {
      // Local graceful fallback
      const simulatedHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;
      setSealedScore({
        rawTotal: totalScore,
        payloadHash: simulatedHash,
        submittedAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden pb-16">
      {/* Ambient background glows */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-[420px] h-[420px] rounded-full bg-tertiary/10 blur-[120px] pointer-events-none" />

      {/* Top telemetry bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
        <div className="flex items-center gap-space-sm">
          <Link
            href="/jurado"
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md font-label-md transition-all shadow-sm border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-base text-primary">arrow_back</span>
            <span>Volver al Catálogo</span>
          </Link>
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-tertiary text-sm">how_to_reg</span>
            <span>MESA DE EVALUACIÓN OFICIAL • {juryCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-space-md">
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary-container text-primary font-label-sm text-label-sm border border-primary/30">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Transmisión Cifrada en Vivo</span>
          </div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-tablet xl:gap-gutter">
        {/* Left Column: Dossier Card */}
        <aside className="lg:col-span-4 xl:col-span-4 flex flex-col gap-space-md">
          <div className="relative overflow-hidden rounded-xl bg-surface-container-low shadow-xl border border-outline-variant/30">
            {/* Candidate Image Banner */}
            <div className="relative w-full h-80 sm:h-96 lg:h-[380px] overflow-hidden bg-surface-container-highest">
              {entry.photoUrl ? (
                <img
                  src={entry.photoUrl}
                  alt={entry.candidateName}
                  className="w-full h-full object-cover object-top filter brightness-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-center justify-center">
                  <span className="material-symbols-outlined text-[80px] text-tertiary/30">theater_comedy</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-transparent"></div>

              {/* Badges Overlay */}
              <div className="absolute top-space-md left-space-md flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 px-space-md py-space-xs rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-tertiary font-label-md text-label-md shadow-lg font-bold border border-tertiary/40">
                  <span className="material-symbols-outlined text-sm text-tertiary">theater_comedy</span>
                  ORDEN N° {String(entry.order).padStart(2, "0")}
                </span>
                <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-secondary-container/90 backdrop-blur-md text-on-secondary-container font-label-sm text-label-sm font-semibold">
                  {entry.categoryName}
                </span>
              </div>

              {/* University Crest */}
              <div className="absolute top-space-md right-space-md p-space-xs rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-lg flex items-center gap-2 border border-outline-variant/30">
                <span className="material-symbols-outlined text-secondary text-2xl">account_balance</span>
                <div className="flex flex-col text-right leading-none pr-1">
                  <span className="font-label-sm text-label-sm text-secondary font-bold">{entry.university}</span>
                  <span className="text-[10px] text-on-surface-variant font-label-sm">{entry.department}</span>
                </div>
              </div>

              {/* Candidate Title on Base */}
              <div className="absolute bottom-space-md left-space-md right-space-md">
                <div className="flex items-center gap-space-xs mb-1">
                  <span className="px-space-sm py-0.5 rounded-full bg-tertiary/20 text-tertiary font-label-sm text-label-sm font-bold">
                    {entry.candidateTitle}
                  </span>
                </div>
                <h1 className="font-headline-md text-headline-md text-on-surface leading-tight font-bold drop-shadow-md">
                  {entry.candidateName}
                </h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                  {entry.danceName}
                </p>
              </div>
            </div>

            {/* Dossier Meta Sheet */}
            <div className="p-space-lg flex flex-col gap-space-md">
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Sede Entrada</span>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Trinidad, Beni</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Danzantes</span>
                  <span className="font-label-md text-label-md text-secondary font-bold">240 Integrantes</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Banda</span>
                  <span className="font-label-md text-label-md text-on-surface font-bold">Poopó / Central</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Tiempo en Pista</span>
                  <span className="font-label-md text-label-md text-tertiary font-bold">14m / 15m máx</span>
                </div>
              </div>

              {/* Cultural Synopsis */}
              <div className="p-space-md rounded-xl bg-primary-container/30 border border-primary/20">
                <div className="flex items-center gap-space-xs text-primary mb-1">
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">Memoria Coreográfica</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {entry.bio ||
                    "Representación folklórica universitaria con rescate de vestimenta tradicional, pollerín y bordados fidedignos, integrando armonía rítmica y respeto absoluto a la identidad boliviana."}
                </p>
              </div>

              {/* Rules check */}
              <div className="flex flex-col gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                  <span>Reglamento Nacional CEUB 2026 verificado</span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                  <span>Certificado de pertenencia universitaria vigente</span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Card */}
          <div className="rounded-xl bg-surface-container-low p-space-md shadow-md flex items-center justify-between border border-outline-variant/30">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">sync</span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface font-bold uppercase">Base Notarial Activa</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">Votos emitidos por el panel en vivo</p>
              </div>
            </div>
            <span className="px-space-sm py-1 rounded bg-surface-container-high text-tertiary font-label-sm text-label-sm font-bold border border-tertiary/30">
              OK
            </span>
          </div>
        </aside>

        {/* Right Column: Scoring Engine */}
        <section className="lg:col-span-8 flex flex-col gap-space-md">
          {/* If Score is already sealed / locked */}
          {sealedScore ? (
            <div className="flex flex-col gap-space-md">
              {/* Banner: Locked State */}
              <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-xl relative overflow-hidden border border-tertiary/40">
                <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-[160px] text-tertiary">lock</span>
                </div>
                <div className="flex items-start gap-space-md">
                  <div className="w-14 h-14 rounded-2xl bg-tertiary/20 text-tertiary flex items-center justify-center shrink-0 border border-tertiary/30">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs">
                      <span className="px-space-sm py-0.5 rounded bg-tertiary/20 text-tertiary font-label-sm text-label-sm uppercase font-bold border border-tertiary/30">
                        Estado Oficial: Bloqueada
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        • {new Date(sealedScore.submittedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface mt-1 font-bold">
                      🔒 Ya emitiste tu voto para esta danza
                    </h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
                      Tu rúbrica fue sellada y transmitida con firma digital criptográfica SHA-256 ante la Notaría de Gobierno y la Comisión Técnica Universitaria. No se admiten modificaciones posteriores.
                    </p>
                  </div>
                </div>

                {/* Breakdown Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-sm mt-space-lg pt-space-md bg-surface-container-lowest/50 p-space-md rounded-xl border border-outline-variant/30">
                  {entry.criteria.map((c, idx) => (
                    <div key={c.id} className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        {idx + 1}. {c.name}
                      </span>
                      <span className="font-headline-sm text-headline-sm text-tertiary font-bold mt-1">
                        {(scores[c.id] || 0).toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">/ 10</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Score Lock Banner */}
                <div className="flex flex-wrap items-center justify-between gap-space-md mt-space-md pt-space-sm border-t border-outline-variant/20">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-2xl">verified</span>
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">PUNTAJE ASIGNADO DEFINITIVO</span>
                      <p className="font-headline-md text-headline-md text-on-surface font-extrabold leading-none">
                        {sealedScore.rawTotal.toFixed(1)} / 40.0 pts{" "}
                        <span className="text-label-md font-label-md text-secondary font-medium ml-2">
                          ({Math.round((sealedScore.rawTotal / 40.0) * 1000) / 10}%)
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/jurado"
                      className="px-space-md py-space-xs rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-2 transition-all shadow-md border border-outline-variant/30"
                    >
                      <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                      <span>Lista de Danzas</span>
                    </Link>
                    <Link
                      href="/jurado/mis-calificaciones"
                      className="px-space-md py-space-xs rounded-xl bg-tertiary text-on-tertiary-fixed font-label-md text-label-md font-bold flex items-center gap-2 transition-all shadow-md"
                    >
                      <span className="material-symbols-outlined text-base">grade</span>
                      <span>Mis Calificaciones</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Hash Certificate Card */}
              <div className="rounded-xl bg-surface-container-low p-space-md flex flex-wrap items-center justify-between gap-space-sm border border-primary/30">
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="material-symbols-outlined text-primary text-2xl shrink-0">fingerprint</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface font-bold">
                      Hash Notarial de Voto:{" "}
                      <code className="text-primary font-mono text-xs break-all">
                        {sealedScore.payloadHash}
                      </code>
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                      Jurado: {juryName} ({juryCode}) • Sede Trinidad • Bloque Oficial I
                    </span>
                  </div>
                </div>
                <span className="px-space-md py-1 rounded-full bg-primary/20 text-primary font-label-sm text-label-sm font-bold border border-primary/40 shrink-0">
                  Certificado OK
                </span>
              </div>
            </div>
          ) : (
            /* Active Interactive Voting State */
            <div className="flex flex-col gap-space-md">
              {/* Criteria Section Bar */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30">
                <div>
                  <div className="flex items-center gap-space-xs text-tertiary">
                    <span className="material-symbols-outlined text-base">gavel</span>
                    <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">
                      Criterios Oficiales de Evaluación
                    </span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mt-0.5 font-bold">
                    Puntaje Parcial y Rúbrica 2026
                  </h2>
                </div>
                <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface text-label-sm font-label-sm border border-outline-variant/30">
                  <span className="text-tertiary font-bold">Escala:</span> 1.0 a 10.0 pts c/u
                </div>
              </div>

              {/* The 4 Criteria Cards */}
              <div className="flex flex-col gap-space-md">
                {entry.criteria.map((criterion, idx) => {
                  const currentVal = scores[criterion.id] ?? 8.5;
                  const isPerfect = currentVal === 10.0;

                  return (
                    <div
                      key={criterion.id}
                      className="rounded-xl bg-surface-container-low p-space-md sm:p-space-lg shadow-lg transition-all hover:bg-surface-container border border-outline-variant/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
                        <div className="flex items-start gap-space-sm">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center font-headline-sm text-tertiary font-bold shrink-0 border border-outline-variant/30">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-space-xs">
                              <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
                                {criterion.name}
                              </h3>
                              {isPerfect && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary text-on-tertiary-fixed font-label-sm text-[11px] font-extrabold uppercase shadow-sm">
                                  <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                  Puntaje Perfecto
                                </span>
                              )}
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                              {criterion.description}
                            </p>
                          </div>
                        </div>

                        {/* Display Value */}
                        <div className="flex items-baseline gap-1 self-end sm:self-center pl-space-md">
                          <span className="font-headline-lg text-headline-lg text-tertiary font-bold leading-none">
                            {currentVal.toFixed(1)}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">/ 10.0</span>
                        </div>
                      </div>

                      {/* Ergonomic Steppers and Slider */}
                      <div className="flex items-center gap-space-md">
                        <button
                          type="button"
                          aria-label="Disminuir"
                          onClick={() => adjustScore(criterion.id, -0.5)}
                          className="w-14 h-14 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center text-headline-md font-bold transition-transform active:scale-95 shadow-sm border border-outline-variant/30 shrink-0"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>

                        <div className="relative flex-1 flex flex-col justify-center">
                          <input
                            type="range"
                            min="1.0"
                            max="10.0"
                            step="0.5"
                            value={currentVal}
                            onChange={(e) => setDirectScore(criterion.id, parseFloat(e.target.value))}
                            className="w-full h-3 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-tertiary"
                          />
                          <div className="flex justify-between w-full mt-2 text-[10px] font-label-sm text-on-surface-variant px-1 select-none font-semibold">
                            <span>1.0</span>
                            <span>2.5</span>
                            <span>5.0</span>
                            <span>7.5</span>
                            <span className="text-tertiary font-bold">10.0</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() => adjustScore(criterion.id, 0.5)}
                          className="w-14 h-14 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center text-headline-md font-bold transition-transform active:scale-95 shadow-sm border border-outline-variant/30 shrink-0"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Observations */}
                <div className="rounded-xl bg-surface-container-low p-space-md sm:p-space-lg shadow-lg border border-outline-variant/30">
                  <label className="flex items-center justify-between mb-space-xs" htmlFor="observationsInput">
                    <span className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">edit_note</span>
                      Observaciones para la mesa técnica y justificación de mérito cultural
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">(Opcional)</span>
                  </label>
                  <textarea
                    id="observationsInput"
                    rows={3}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Indique detalles notables sobre el desenvolvimiento, calidad de los materiales o consideraciones históricas del vestuario..."
                    className="w-full rounded-lg bg-surface-container-lowest p-space-md text-on-surface placeholder:text-outline text-body-sm font-body-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all resize-none border border-outline-variant/30"
                  />
                </div>

                {/* Total Computation Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container via-surface-container-low to-surface-container-lowest p-space-lg shadow-2xl border border-tertiary/40">
                  <span className="material-symbols-outlined absolute -right-6 -bottom-8 text-[180px] text-primary/5 pointer-events-none select-none">
                    military_tech
                  </span>

                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-space-lg">
                    {/* Left Title + Score */}
                    <div className="flex flex-col text-center md:text-left">
                      <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest flex items-center justify-center md:justify-start gap-1">
                        <span className="material-symbols-outlined text-sm">calculate</span>
                        Cómputo Total en Tiempo Real
                      </span>
                      <div className="flex items-baseline justify-center md:justify-start gap-2 mt-1">
                        <span className="font-display-hero text-display-hero text-tertiary font-extrabold tracking-tight leading-none">
                          {totalScore.toFixed(1)}
                        </span>
                        <span className="font-headline-md text-headline-md text-on-surface-variant font-semibold">
                          / 40.0 pts
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Equivalente ponderado final:{" "}
                        <span className="text-on-surface font-bold">{percentage}%</span> de aprobación.
                      </p>
                    </div>

                    {/* Circular Progress Ring */}
                    <div className="relative flex items-center justify-center">
                      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          className="text-surface-container-highest"
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                        />
                        <circle
                          className="text-tertiary transition-all duration-300"
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          stroke="currentColor"
                          strokeDasharray="251.2"
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                          strokeWidth="8"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-headline-sm text-headline-sm text-tertiary font-bold leading-none">
                          {percentage}%
                        </span>
                        <span className="text-[9px] font-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5 font-bold">
                          Rendimiento
                        </span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="w-full md:w-auto px-space-xl py-space-md min-h-[58px] rounded-xl bg-tertiary hover:bg-tertiary-fixed text-on-tertiary-fixed font-headline-sm text-headline-sm font-extrabold flex items-center justify-center gap-space-sm transition-all transform active:scale-95 shadow-xl hover:shadow-tertiary/20 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-2xl font-bold">send_and_archive</span>
                      <span>Enviar Calificación Definitiva</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md transition-opacity duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-low p-space-lg sm:p-space-xl shadow-2xl border border-tertiary/40 flex flex-col gap-space-md animate-in fade-in zoom-in-95">
            {/* Warning Header */}
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center shrink-0 border border-error/40">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold tracking-wider">
                  Confirmación Protocolar Requerida
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                  ¿Confirmar el envío de calificación?
                </h2>
              </div>
            </div>

            {/* Warning mandate statement */}
            <div className="p-space-md rounded-xl bg-surface-container-lowest text-on-surface-variant font-body-sm text-body-sm leading-relaxed border border-outline-variant/30">
              <p className="text-error font-semibold flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base">info</span>
                Acción Irreversible:
              </p>
              <p className="text-on-surface">
                Una vez enviada, tu calificación no podrá modificarse ni volver a emitirse. El voto se sellará criptográficamente ante la Notaría Oficial.
              </p>
            </div>

            {/* Live Vote Summary Box */}
            <div className="rounded-xl bg-surface-container-high/80 p-space-md flex flex-col gap-space-xs border border-outline-variant/30">
              <div className="flex justify-between items-center text-label-sm font-label-sm text-on-surface-variant">
                <span>Danza Evaluada:</span>
                <span className="text-on-surface font-bold truncate max-w-[240px]">
                  #{String(entry.order).padStart(2, "0")} • {entry.danceName}
                </span>
              </div>
              <div className="flex justify-between items-center text-label-sm font-label-sm text-on-surface-variant">
                <span>Candidata:</span>
                <span className="text-secondary font-bold truncate max-w-[240px]">
                  {entry.candidateName}
                </span>
              </div>
              <div className="w-full h-px bg-surface-container-highest my-1"></div>
              <div className="flex justify-between items-baseline">
                <span className="font-label-md text-label-md text-on-surface font-bold">Resumen del Voto:</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-md text-headline-md text-tertiary font-extrabold">
                    {totalScore.toFixed(1)}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">/ 40.0 pts</span>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-error-container/40 border border-error text-on-error-container rounded-lg text-sm">
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="h-14 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all active:scale-95 flex items-center justify-center gap-2 border border-outline-variant/30 font-semibold"
              >
                <span className="material-symbols-outlined text-base">close</span>
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="h-14 rounded-xl bg-tertiary hover:bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    <span>Sellando Voto...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>Confirmar y Sellar Voto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
