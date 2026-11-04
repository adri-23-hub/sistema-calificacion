"use client";

/**
 * Modal de alta/edición de Grupo de Danza (Módulo A).
 * Permite crear la fraternidad al instante si aún no existe.
 * La foto se comprime en el navegador antes de subirse.
 */

import { useState } from "react";
import PhotoUpload from "@/features/admin/components/PhotoUpload";
import {
  createDanceGroupAction,
  updateDanceGroupAction,
  createFraternityAction,
} from "@/features/admin/actions";

export interface AdminFraternityOption {
  id: string;
  name: string;
  university: string;
  faculty: string | null;
  city: string;
  department: string;
  logoUrl: string | null;
  hasDanceGroup: boolean;
}

export interface DanceGroupFormData {
  id?: string;
  danceName: string;
  photoUrl: string | null;
  fraternityId: string;
  numberOfDancers: number;
  entryOrder: number | null;
  hasCaratula: boolean;
  hasMonografia: boolean;
  hasDancerList: boolean;
  hasInvitation: boolean;
}

interface DanceRegistrationModalProps {
  editionId: string;
  fraternities: AdminFraternityOption[];
  initial?: DanceGroupFormData | null;
  onClose: () => void;
  onFraternitiesChanged: (fraternities: AdminFraternityOption[]) => void;
  onSaved: (result: {
    group?: DanceGroupFormData & { id: string };
    fraternities: AdminFraternityOption[];
  }) => void;
}

export default function DanceRegistrationModal({
  fraternities,
  initial,
  editionId,
  onFraternitiesChanged,
  onClose,
  onSaved,
}: DanceRegistrationModalProps) {
  const isEdit = Boolean(initial?.id);

  const [fratId, setFratId] = useState(initial?.fraternityId ?? "");
  const [danceName, setDanceName] = useState(initial?.danceName ?? "");
  const [numberOfDancers, setNumberOfDancers] = useState<number | "">(initial?.numberOfDancers ?? "");
  const [entryOrder, setEntryOrder] = useState<number | "">(initial?.entryOrder ?? "");
  const [hasCaratula, setHasCaratula] = useState(initial?.hasCaratula ?? false);
  const [hasMonografia, setHasMonografia] = useState(initial?.hasMonografia ?? false);
  const [hasDancerList, setHasDancerList] = useState(initial?.hasDancerList ?? false);
  const [hasInvitation, setHasInvitation] = useState(initial?.hasInvitation ?? false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photoUrl ?? null);

  // Alta de fraternidad en caliente
  const [newFrat, setNewFrat] = useState(false);
  const [frats, setFrats] = useState<AdminFraternityOption[]>(fraternities);
  const [newFratForm, setNewFratForm] = useState({
    name: "",
    university: "",
    faculty: "",
    city: "",
    department: "",
  });
  const [newFratLogo, setNewFratLogo] = useState<string | null>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const blocked = saving !== null || photoBusy || logoBusy;

  const effectiveFratId = newFrat ? "" : fratId;

  const handleSubmit = async () => {
    if (blocked) return;
    setError(null);

    if (isEdit && !initial?.id) return;

    if (!isEdit && newFrat) {
      if (!newFratForm.name.trim() || !newFratForm.university.trim() || !newFratForm.city.trim() || !newFratForm.department.trim()) {
        setError("Completa nombre, universidad, ciudad y departamento de la nueva fraternidad.");
        return;
      }
    } else if (!effectiveFratId) {
      setError("Selecciona la fraternidad.");
      return;
    }
    if (!danceName.trim()) {
      setError("Ingresa el nombre de la danza.");
      return;
    }
    if (!numberOfDancers || numberOfDancers < 1) {
      setError("Ingresa el número de bailarines.");
      return;
    }

    try {
      setSaving(isEdit ? "Guardando cambios…" : "Registrando danza…");

      let finalFratId = effectiveFratId;
      let updatedFrats = frats;

      if (!isEdit && newFrat) {
        setSaving("Registrando fraternidad…");
        const fratRes = await createFraternityAction({
          editionId,
          name: newFratForm.name,
          university: newFratForm.university,
          faculty: newFratForm.faculty || undefined,
          city: newFratForm.city,
          department: newFratForm.department,
          logoUrl: newFratLogo ?? undefined,
        });
        if (!fratRes.success || !fratRes.fraternityId) {
          setSaving(null);
          setError(fratRes.error || "No se pudo crear la fraternidad.");
          return;
        }
        finalFratId = fratRes.fraternityId;
        updatedFrats = [
          ...frats,
          {
            id: fratRes.fraternityId!,
            name: newFratForm.name.trim(),
            university: newFratForm.university.trim(),
            faculty: newFratForm.faculty?.trim() || null,
            city: newFratForm.city.trim(),
            department: newFratForm.department.trim(),
            logoUrl: newFratLogo,
            hasDanceGroup: false,
          },
        ];
        setFrats(updatedFrats);
        onFraternitiesChanged(updatedFrats);
        setFratId(finalFratId);
        setNewFrat(false);
      }

      if (isEdit && initial?.id) {
        setSaving("Guardando cambios…");
        const res = await updateDanceGroupAction({
          editionId,
          danceGroupId: initial.id,
          fraternityId: finalFratId,
          danceName: danceName.trim(),
          numberOfDancers: Number(numberOfDancers),
          entryOrder: entryOrder ? Number(entryOrder) : null,
          hasCaratula,
          hasMonografia,
          hasDancerList,
          hasInvitation,
          photoUrl, // null = quitar la foto
        });
        if (!res.success) {
          setSaving(null);
          setError(res.error || "No se pudo guardar.");
          return;
        }
        onSaved({
          fraternities: updatedFrats,
          group: {
            id: initial.id,
            danceName: danceName.trim(),
            photoUrl,
            fraternityId: finalFratId,
            numberOfDancers: Number(numberOfDancers),
            entryOrder: entryOrder ? Number(entryOrder) : null,
            hasCaratula,
            hasMonografia,
            hasDancerList,
            hasInvitation,
          },
        });
      } else {
        setSaving("Registrando danza…");
        const res = await createDanceGroupAction({
          editionId,
          fraternityId: finalFratId,
          danceName: danceName.trim(),
          numberOfDancers: Number(numberOfDancers),
          entryOrder: entryOrder ? Number(entryOrder) : undefined,
          hasCaratula,
          hasMonografia,
          hasDancerList,
          hasInvitation,
          photoUrl: photoUrl ?? undefined,
        });
        if (!res.success || !res.danceGroupId) {
          setSaving(null);
          setError(res.error || "No se pudo registrar la danza.");
          return;
        }
        onSaved({
          fraternities: updatedFrats.map((f) => (f.id === finalFratId ? { ...f, hasDanceGroup: true } : f)),
          group: {
            id: res.danceGroupId,
            danceName: danceName.trim(),
            photoUrl,
            fraternityId: finalFratId,
            numberOfDancers: Number(numberOfDancers),
            entryOrder: entryOrder ? Number(entryOrder) : null,
            hasCaratula,
            hasMonografia,
            hasDancerList,
            hasInvitation,
          },
        });
      }
    } catch {
      setSaving(null);
      setError("Error inesperado al guardar. Revisa tu conexión.");
    }
  };

  const inputCls =
    "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white";
  const labelCls = "block text-[11px] font-semibold text-slate-400 mb-1";

  return (
    <div className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isEdit ? "Editar danza" : "Registrar danza"}>
      <div className="app-dialog-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {isEdit ? "Editar Grupo de Danza" : "Registrar Grupo de Danza"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Módulo A &bull; Entrada Folklórica Universitaria Nacional
            </p>
          </div>
          <button onClick={onClose} disabled={blocked} aria-label="Cerrar" className="text-slate-500 hover:text-white text-lg">
            ✕
          </button>
        </div>

        <fieldset disabled={saving !== null} className="space-y-5">
        {/* FRATERNIDAD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Fraternidad
            </label>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setNewFrat((v) => !v)}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
              >
                {newFrat ? "← Elegir existente" : "➕ Nueva fraternidad"}
              </button>
            )}
          </div>

          {isEdit || !newFrat ? (
            <select
              value={fratId}
              onChange={(e) => setFratId(e.target.value)}
              className={inputCls}
              disabled={isEdit}
            >
              <option value="">— Selecciona fraternidad —</option>
              {frats.map((f) => {
                const disabledOpt = !isEdit && f.hasDanceGroup;
                return (
                  <option key={f.id} value={f.id} disabled={disabledOpt}>
                    {f.name} · {f.university} ({f.department})
                    {disabledOpt ? " — ya tiene danza" : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
              <div>
                <label className={labelCls}>Nombre de la fraternidad *</label>
                <input
                  className={inputCls}
                  value={newFratForm.name}
                  onChange={(e) => setNewFratForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Fraternidad …"
                />
              </div>
              <div>
                <label className={labelCls}>Universidad *</label>
                <input
                  className={inputCls}
                  value={newFratForm.university}
                  onChange={(e) => setNewFratForm((p) => ({ ...p, university: e.target.value }))}
                  placeholder="UMSA, UMSS, …"
                />
              </div>
              <div>
                <label className={labelCls}>Facultad / carrera</label>
                <input
                  className={inputCls}
                  value={newFratForm.faculty}
                  onChange={(e) => setNewFratForm((p) => ({ ...p, faculty: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ciudad *</label>
                  <input
                    className={inputCls}
                    value={newFratForm.city}
                    onChange={(e) => setNewFratForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="La Paz"
                  />
                </div>
                <div>
                  <label className={labelCls}>Departamento *</label>
                  <input
                    className={inputCls}
                    value={newFratForm.department}
                    onChange={(e) => setNewFratForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder="La Paz"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Logo / escudo (se comprime automáticamente)</label>
                <PhotoUpload
                  value={newFratLogo}
                  disabled={saving !== null}
                  onBusyChange={setLogoBusy}
                  onChange={(url) => setNewFratLogo(url)}
                />
              </div>
            </div>
          )}
        </div>

        {/* DATOS DE LA DANZA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre de la danza *</label>
            <input
              className={inputCls}
              value={danceName}
              onChange={(e) => setDanceName(e.target.value)}
              placeholder="Morenada, Caporales, Tinkus…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bailarines *</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={numberOfDancers}
                onChange={(e) => setNumberOfDancers(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
            <div>
              <label className={labelCls}>Orden #</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={entryOrder}
                onChange={(e) => setEntryOrder(e.target.value ? Number(e.target.value) : "")}
                placeholder="Sorteo"
              />
            </div>
          </div>
        </div>

        {/* CHECKLIST DE INSCRIPCIÓN */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Checklist de inscripción
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["hasCaratula", "Carátula"],
                ["hasMonografia", "Monografía (min. 4 hojas)"],
                ["hasDancerList", "Lista de bailarines con C.I."],
                ["hasInvitation", "Carta de invitación (externa)"],
              ] as const
            ).map(([key, label]) => {
              const checked =
                key === "hasCaratula"
                  ? hasCaratula
                  : key === "hasMonografia"
                  ? hasMonografia
                  : key === "hasDancerList"
                  ? hasDancerList
                  : hasInvitation;
              const toggle =
                key === "hasCaratula"
                  ? setHasCaratula
                  : key === "hasMonografia"
                  ? setHasMonografia
                  : key === "hasDancerList"
                  ? setHasDancerList
                  : setHasInvitation;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(!checked)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    checked
                      ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {checked ? "✓ " : ""}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* FOTO */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Foto del grupo
          </label>
          <PhotoUpload value={photoUrl} onChange={(url) => setPhotoUrl(url)} disabled={saving !== null} onBusyChange={setPhotoBusy} />
        </div>
        </fieldset>

        {error && (
          <p className="text-xs bg-rose-950/60 border border-rose-500/30 text-rose-300 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={blocked}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer"
          >
            {saving ?? (isEdit ? "Guardar cambios" : "Registrar danza")}
          </button>
        </div>
      </div>
    </div>
  );
}
