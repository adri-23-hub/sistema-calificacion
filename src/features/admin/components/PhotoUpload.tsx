"use client";

/**
 * Widget reutilizable de foto: selecciona archivo, comprime en el navegador
 * (≤ 200 KB aprox.) y lo sube a /api/images. Entrega la URL final al padre.
 */

import { useEffect, useRef, useState } from "react";
import { compressImageFile, ACCEPTED_MIME_TYPES } from "@/lib/image-compress";

interface PhotoUploadProps {
  value: string | null; // foto actual (/api/images/<id>)
  onChange: (photoUrl: string | null) => void;
  disabled?: boolean;
  compact?: boolean; // versión mini para tablas
  onBusyChange?: (busy: boolean) => void;
}

export default function PhotoUpload({ value, onChange, disabled, compact, onBusyChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const uploadingRef = useRef(false);

  const [busy, setBusy] = useState<string | null>(null); // mensaje de estado
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<[string, number, number] | null>(null); // [label, original, compressed]
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Limpieza del objectURL temporal
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handlePick = async (picked: File) => {
    if (disabled || busy || uploadingRef.current) return;
    uploadingRef.current = true;
    onBusyChange?.(true);
    setBusy("Leyendo imagen…");
    setError(null);

    try {
      if (picked.size > 15 * 1024 * 1024) {
        throw new Error("La foto original excede 15 MB, elige otra más liviana.");
      }
      // Safari puede entregar HEIC que el canvas no decodifica
      if (picked.type === "image/heic" || picked.type === "image/heif") {
        throw new Error("Formato HEIC no soportado con el navegador actual. Configura tu celular para guardar en JPG.");
      }

      setBusy("Comprimiendo…");
      const result = await compressImageFile(picked);

      setBusy("Subiendo…");
      const body = new FormData();
      body.append("file", new File([result.blob], "foto.bin", { type: result.mime }));
      const res = await fetch("/api/images", { method: "POST", body });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Error al subir la imagen (HTTP ${res.status})`);
      }
      const json = (await res.json()) as { url: string };

      // Vista previa inmediata con el propio blob
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = URL.createObjectURL(result.blob);
      setLocalPreview(previewUrlRef.current);

      setMeta(["Comprimida de forma óptima", result.originalSize, result.compressedSize]);
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado al procesar la imagen.");
    } finally {
      uploadingRef.current = false;
      onBusyChange?.(false);
      setBusy(null);
    }
  };

  const currentSrc = localPreview ?? value;
  const showSize =
    meta && meta[0] === "Comprimida de forma óptima"
      ? `${Math.round(meta[2] / 1024)} KB (antes ${Math.round(meta[1] / 1024) >= 1024 ? (meta[1] / 1024 / 1024).toFixed(1) + " MB" : Math.round(meta[1] / 1024) + " KB"})`
      : null;

  if (compact) {
    return (
      <button
        type="button"
        disabled={disabled || !!busy}
        onClick={() => inputRef.current?.click()}
        className="relative w-11 h-8 rounded overflow-hidden border border-slate-600 bg-slate-950 flex items-center justify-center mx-auto"
        title={currentSrc ? "Cambiar foto" : "Subir foto"}
      >
        {currentSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentSrc} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-500 text-sm">📷</span>
        )}
        {busy && (
          <span className="absolute inset-0 bg-slate-950/80 text-[9px] text-white flex items-center justify-center">
            {busy === "Subiendo…" ? "⬆" : "…"}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(",")}
          hidden
          disabled={disabled || !!busy}
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void handlePick(file); }}
        />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative w-full h-44 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center group"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled && !busy && e.dataTransfer.files?.[0]) void handlePick(e.dataTransfer.files[0]);
        }}
      >
        {currentSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentSrc} alt="Vista previa" className="w-full h-full object-cover" />
            <div className="absolute right-2 top-2 flex gap-1">
              <button
                type="button"
                disabled={disabled || !!busy}
                onClick={() => inputRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-200 text-[11px] hover:bg-slate-800"
              >
                Cambiar
              </button>
              <button
                type="button"
                disabled={disabled || !!busy}
                onClick={() => {
                  setMeta(null);
                  setLocalPreview(null);
                  onChange(null);
                }}
                className="px-2 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] hover:bg-rose-900"
              >
                Quitar
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || !!busy}
            onClick={() => inputRef.current?.click()}
            className="text-center px-4"
          >
            <span className="block text-2xl mb-1">📷</span>
            <span className="text-xs text-slate-300 font-semibold">Subir fotografía</span>
            <span className="block text-[10px] text-slate-500 mt-1">
              Se redimensiona y comprime automáticamente (≤ 200 KB antes de subir)
            </span>
          </button>
        )}
      </div>

      {busy && (
        <p className="text-[11px] text-indigo-300 animate-pulse">{busy}</p>
      )}
      {showSize && (
        <p className="text-[11px] text-emerald-400">→ {showSize} ✓</p>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        hidden
        disabled={disabled || !!busy}
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void handlePick(file); }}
      />
    </div>
  );
}
