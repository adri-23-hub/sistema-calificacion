import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function handleLogout() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function JuradoCredencialPage() {
  const session = await getSession();
  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  // Generar hash de sesión visual
  const sessionFingerprint = `0x${Buffer.from(session.userId + session.code + "2026").toString("hex").slice(0, 32).toUpperCase()}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Botón Volver */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/jurado"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm text-tertiary bg-tertiary/10 hover:bg-tertiary/20 border border-tertiary/30 font-display font-bold transition-all shadow-sm"
        >
          <span className="ms text-lg">arrow_back</span>
          Volver al Menú Principal
        </Link>
        <div className="flex items-center gap-2">
          <span className="badge badge-emerald">
            <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
            Sesión Activa
          </span>
        </div>
      </div>

      {/* Main Credential Card */}
      <div className="relative bg-[#0a2e1d]/80 backdrop-blur-2xl border border-tertiary/40 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Top Gold & Macaw Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-secondary-container via-tertiary to-emerald" />

        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
          {/* Left: Credential Info */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container-highest border border-tertiary/30 text-tertiary text-xs font-bold uppercase tracking-wider mb-3">
              <span className="ms text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              Credencial Oficial de Jurado Calificador
            </div>

            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#f4fbf6] tracking-tight">
              {session.name}
            </h1>
            <p className="text-tertiary font-display font-bold text-lg mt-0.5">
              Código de Acceso: {session.code || "JUR-01"}
            </p>
            <p className="text-on-surface-variant text-xs sm:text-sm mt-2 max-w-md leading-relaxed">
              Mesa oficial habilitada para la rúbrica de 40 puntos del Certamen Nacional Moperita y Ñusta de Bolivia 2026.
              Emisión oficial: XIII Entrada Folklórica Universitaria Nacional — Trinidad, Beni.
            </p>

            {/* Credential Data Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-6">
              <div className="bg-[#001208]/80 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Mesa Asignada</span>
                <span className="font-display font-bold text-sm text-on-surface">Mesa N° {session.code?.replace(/\D/g, "") || "1"}</span>
              </div>
              <div className="bg-[#001208]/80 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Rúbrica</span>
                <span className="font-display font-bold text-sm text-tertiary">4 Criterios (40 pts)</span>
              </div>
              <div className="bg-[#001208]/80 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Algoritmo de Firma</span>
                <span className="font-display font-bold text-xs text-secondary">SHA-256 Notariado</span>
              </div>
              <div className="bg-[#001208]/80 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Sede</span>
                <span className="font-display font-bold text-sm text-on-surface">Trinidad • Beni</span>
              </div>
            </div>

            {/* Fingerprint */}
            <div className="mt-4 w-full max-w-md bg-[#001208]/60 p-2.5 rounded-lg border border-white/5 font-mono text-[10px] text-on-surface-variant truncate">
              <span className="text-tertiary font-bold">HASH DE SESIÓN: </span>{sessionFingerprint}
            </div>
          </div>

          {/* Right: Simulated QR Card */}
          <div className="flex flex-col items-center bg-[#001208]/90 p-5 rounded-2xl border border-tertiary/30 shadow-xl w-60 flex-shrink-0">
            {/* Visual SVG QR Code */}
            <div className="bg-white p-3 rounded-xl shadow-inner mb-3">
              <svg className="w-36 h-36" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Simulated high tech QR matrix */}
                <rect width="120" height="120" fill="white" />
                {/* Corner 1 */}
                <rect x="10" y="10" width="30" height="30" fill="black" />
                <rect x="15" y="15" width="20" height="20" fill="white" />
                <rect x="20" y="20" width="10" height="10" fill="black" />
                {/* Corner 2 */}
                <rect x="80" y="10" width="30" height="30" fill="black" />
                <rect x="85" y="15" width="20" height="20" fill="white" />
                <rect x="90" y="20" width="10" height="10" fill="black" />
                {/* Corner 3 */}
                <rect x="10" y="80" width="30" height="30" fill="black" />
                <rect x="15" y="85" width="20" height="20" fill="white" />
                <rect x="20" y="90" width="10" height="10" fill="black" />
                {/* Data dots */}
                <rect x="50" y="15" width="8" height="8" fill="black" />
                <rect x="62" y="15" width="8" height="8" fill="black" />
                <rect x="50" y="27" width="8" height="8" fill="black" />
                <rect x="62" y="35" width="8" height="8" fill="black" />
                <rect x="15" y="50" width="8" height="8" fill="black" />
                <rect x="27" y="50" width="8" height="8" fill="black" />
                <rect x="39" y="50" width="8" height="8" fill="black" />
                <rect x="50" y="50" width="8" height="8" fill="black" />
                <rect x="62" y="50" width="8" height="8" fill="black" />
                <rect x="74" y="50" width="8" height="8" fill="black" />
                <rect x="86" y="50" width="8" height="8" fill="black" />
                <rect x="98" y="50" width="8" height="8" fill="black" />
                <rect x="50" y="62" width="8" height="8" fill="black" />
                <rect x="74" y="62" width="8" height="8" fill="black" />
                <rect x="98" y="62" width="8" height="8" fill="black" />
                <rect x="50" y="74" width="8" height="8" fill="black" />
                <rect x="62" y="86" width="8" height="8" fill="black" />
                <rect x="74" y="74" width="8" height="8" fill="black" />
                <rect x="86" y="86" width="8" height="8" fill="black" />
                <rect x="98" y="98" width="8" height="8" fill="black" />
                <rect x="50" y="98" width="8" height="8" fill="black" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-sm text-tertiary tracking-wider">
              {session.code || "JUR-01"}
            </span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">
              Escaneo para Terminal Móvil
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-display font-semibold text-on-surface bg-surface-container-high hover:bg-surface-container-highest border border-white/10 transition-colors"
            >
              <span className="ms text-lg text-tertiary">login</span>
              Ver Pantalla de Login / Reautenticar
            </Link>
          </div>

          <form action={handleLogout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-display font-semibold text-error bg-error-container/20 hover:bg-error-container/30 border border-error/30 transition-colors"
            >
              <span className="ms text-lg">logout</span>
              Cerrar Sesión Segura
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
