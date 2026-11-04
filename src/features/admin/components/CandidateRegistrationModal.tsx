"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createFraternityAction, createParticipantAction } from "@/features/admin/actions";
import { participantSchema, fraternitySchema } from "@/lib/validations";
import type { CandidateCategoryOption, RegisteredCandidate } from "../candidate-types";
import type { AdminFraternityOption } from "./DanceRegistrationModal";
import FraternityFields, { EMPTY_FRATERNITY_FORM } from "./FraternityFields";
import PhotoUpload from "./PhotoUpload";

interface Props {
  editionId: string;
  categories: CandidateCategoryOption[];
  fraternities: AdminFraternityOption[];
  initialCategoryId?: string;
  onClose: () => void;
  onFraternitiesChanged: (fraternities: AdminFraternityOption[]) => void;
  onSaved: (candidate: RegisteredCandidate, fraternities: AdminFraternityOption[]) => void;
}

export default function CandidateRegistrationModal({ editionId, categories, fraternities, initialCategoryId, onClose, onSaved, onFraternitiesChanged }: Props) {
  const id = useId();
  const headingId = `${id}-title`;
  const dialog = useRef<HTMLDivElement>(null);
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? categories.find((c) => c.status !== "CLOSED" && c.hasRunways)?.id ?? "");
  const [fraternityId, setFraternityId] = useState("");
  const [frats, setFrats] = useState(fraternities);
  const [fullName, setFullName] = useState("");
  const [career, setCareer] = useState("");
  const [bio, setBio] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [hasMatricula, setHasMatricula] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [newFraternity, setNewFraternity] = useState(false);
  const [fraternityForm, setFraternityForm] = useState(EMPTY_FRATERNITY_FORM);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = saving || photoBusy || logoBusy;
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const available = frats.filter((f) => !selectedCategory?.occupiedFraternityIds.includes(f.id));

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    setError(null);
    if (!selectedCategory || selectedCategory.status === "CLOSED" || !selectedCategory.hasRunways) {
      setError("Selecciona una categoría abierta con sus tres pasadas configuradas."); return;
    }
    const parsed = participantSchema.safeParse({ editionId, categoryId, fraternityId: newFraternity ? "new" : fraternityId, fullName, career, bio, photoUrl, isAdult, hasMatricula });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Revisa los datos de la candidata."); return; }
    const newFraternityData = newFraternity ? fraternitySchema.safeParse({ editionId, ...fraternityForm, logoUrl }) : null;
    if (newFraternityData && !newFraternityData.success) { setError(newFraternityData.error.issues[0]?.message || "Revisa los datos de la fraternidad."); return; }
    setSaving(true);
    try {
      let targetFraternityId = fraternityId;
      let updatedFrats = frats;
      if (newFraternityData?.success) {
        const response = await createFraternityAction(newFraternityData.data);
        if (!response.success || !response.fraternityId) throw new Error(response.error || "No se pudo crear la fraternidad.");
        targetFraternityId = response.fraternityId;
        updatedFrats = [...frats, { ...newFraternityData.data, id: targetFraternityId, faculty: newFraternityData.data.faculty || null, logoUrl, hasDanceGroup: false }];
        setFrats(updatedFrats);
        setFraternityId(targetFraternityId);
        setNewFraternity(false);
        onFraternitiesChanged(updatedFrats);
      }
      const response = await createParticipantAction({ ...parsed.data, fraternityId: targetFraternityId });
      if (!response.success || !response.candidate) throw new Error(response.error || "No se pudo registrar la candidata.");
      onSaved(response.candidate, updatedFrats);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo guardar. Revisa tu conexión."); }
    finally { setSaving(false); }
  }

  const inputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white";
  const labelClass = "block text-xs font-semibold text-slate-300 mb-1";
  return (
    <div className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1}
        className="app-dialog-panel w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 outline-none"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !blocked) onClose();
          if (event.key === "Tab") {
            const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled)') ?? [])].filter((e) => e.getClientRects().length > 0);
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div><h3 id={headingId} className="text-lg font-bold text-white">Registrar candidata</h3>
            <p className="text-xs text-slate-400 mt-1">Moperita y Ñusta de Bolivia · Gala, Casual y Típica</p></div>
          <button type="button" aria-label="Cerrar" disabled={blocked} onClick={onClose} className="shrink-0 px-3 text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <label htmlFor={`${id}-category`} className={labelClass}>Categoría *</label>
              <select id={`${id}-category`} required value={categoryId} className={inputClass} onChange={(e) => { setCategoryId(e.target.value); setFraternityId(""); }}>
                <option value="">Selecciona Moperita o Ñusta</option>
                {categories.map((category) => <option key={category.id} value={category.id} disabled={category.status === "CLOSED" || !category.hasRunways}>
                  {category.name}{category.status === "CLOSED" ? " — cerrada" : !category.hasRunways ? " — faltan pasadas" : ""}
                </option>)}
              </select>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label htmlFor={`${id}-fraternity`} className={labelClass}>Fraternidad *</label>
                <button type="button" className="text-xs text-indigo-300 font-semibold" disabled={blocked} onClick={() => setNewFraternity(!newFraternity)}>
                  {newFraternity ? "Elegir existente" : "+ Nueva fraternidad"}
                </button>
              </div>
              {newFraternity ? <FraternityFields value={fraternityForm} onChange={setFraternityForm} logoUrl={logoUrl} onLogoChange={setLogoUrl} onBusyChange={setLogoBusy} disabled={saving} idPrefix={`${id}-new-fraternity`} /> : <>
                <select id={`${id}-fraternity`} required className={inputClass} value={fraternityId} onChange={(e) => setFraternityId(e.target.value)}>
                  <option value="">Selecciona una fraternidad</option>
                  {frats.map((f) => <option key={f.id} value={f.id} disabled={selectedCategory?.occupiedFraternityIds.includes(f.id)}>{f.name} · {f.university}{selectedCategory?.occupiedFraternityIds.includes(f.id) ? " — ya tiene candidata" : ""}</option>)}
                </select>
                {available.length === 0 && <p className="text-xs text-amber-300 mt-2">Las fraternidades existentes ya tienen candidata en esta categoría. Puedes registrar una nueva fraternidad.</p>}
              </>}
            </div>
            <div><label htmlFor={`${id}-name`} className={labelClass}>Nombre completo *</label>
              <input id={`${id}-name`} autoComplete="name" required maxLength={200} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} /></div>
            <div><label htmlFor={`${id}-career`} className={labelClass}>Carrera (opcional)</label>
              <input id={`${id}-career`} maxLength={200} value={career} onChange={(e) => setCareer(e.target.value)} className={inputClass} /></div>
            <div><label htmlFor={`${id}-bio`} className={labelClass}>Reseña (opcional)</label>
              <textarea id={`${id}-bio`} rows={3} maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} className={inputClass} /></div>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <label className="flex items-center gap-2 min-h-11"><input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} /> Mayoría de edad verificada</label>
              <label className="flex items-center gap-2 min-h-11"><input type="checkbox" checked={hasMatricula} onChange={(e) => setHasMatricula(e.target.checked)} /> Matrícula universitaria presentada</label>
            </div>
            <div><p className={labelClass}>Fotografía de la candidata (opcional)</p>
              <PhotoUpload value={photoUrl} onChange={setPhotoUrl} disabled={saving} onBusyChange={setPhotoBusy} /></div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl">{error}</p>}
          <p className="text-xs text-slate-400">La inscripción incluye las tres pasadas y queda registrada en auditoría.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={blocked} onClick={onClose} className="px-4 py-2 text-sm text-slate-300">Cancelar</button>
            <button type="submit" disabled={blocked || !selectedCategory || selectedCategory.status === "CLOSED" || !selectedCategory.hasRunways}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">{saving ? "Registrando…" : "Registrar candidata"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
