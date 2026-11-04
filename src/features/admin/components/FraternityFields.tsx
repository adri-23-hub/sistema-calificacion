"use client";

import PhotoUpload from "./PhotoUpload";

export interface FraternityFormValues {
  name: string;
  university: string;
  faculty: string;
  city: string;
  department: string;
}

export const EMPTY_FRATERNITY_FORM: FraternityFormValues = { name: "", university: "", faculty: "", city: "", department: "" };

export default function FraternityFields({ value, onChange, logoUrl, onLogoChange, disabled, onBusyChange, idPrefix }: {
  value: FraternityFormValues;
  onChange: (value: FraternityFormValues) => void;
  logoUrl: string | null;
  onLogoChange: (value: string | null) => void;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  idPrefix: string;
}) {
  const fields = [
    ["name", "Nombre de la fraternidad", "Fraternidad …", 200],
    ["university", "Universidad", "UMSA, UMSS, …", 200],
    ["faculty", "Facultad / carrera", "Opcional", 200],
    ["city", "Ciudad", "La Paz", 100],
    ["department", "Departamento", "La Paz", 100],
  ] as const;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
      {fields.map(([key, label, placeholder, maxLength]) => (
        <div key={key}>
          <label htmlFor={`${idPrefix}-${key}`} className="block text-[11px] font-semibold text-slate-400 mb-1">{label}{key !== "faculty" && " *"}</label>
          <input id={`${idPrefix}-${key}`} required={key !== "faculty"} maxLength={maxLength} placeholder={placeholder}
            disabled={disabled} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
        </div>
      ))}
      <div className="sm:col-span-2">
        <p className="block text-[11px] font-semibold text-slate-400 mb-1">Logo / escudo (opcional)</p>
        <PhotoUpload value={logoUrl} onChange={onLogoChange} disabled={disabled} onBusyChange={onBusyChange} />
      </div>
    </div>
  );
}
