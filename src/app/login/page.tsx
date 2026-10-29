"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginJuryAction, loginAdminAction } from "@/features/auth/actions";

type LoginMode = "jurado" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("jurado");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Jury fields
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Admin fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result =
        mode === "jurado"
          ? await loginJuryAction(code, pin)
          : await loginAdminAction(email, password);

      if (result.success && result.redirect) {
        setSuccess(true);
        setTimeout(() => {
          router.push(result.redirect!);
          router.refresh();
        }, 500);
      } else {
        setError(result.error || "Error de autenticación. Verifique sus credenciales.");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión al servidor");
      setLoading(false);
    }
  };

  const fillJuryDemo = () => {
    setCode("JUR-01");
    setPin("1234");
    setError("");
  };

  const fillAdminDemo = () => {
    setEmail("admin@certamen.bo");
    setPassword("admin2026");
    setError("");
  };

  return (
    <main className="w-full min-h-screen bg-amazon-gradient flex items-center justify-center p-4 sm:p-8 selection:bg-tertiary selection:text-on-tertiary">
      <div className="flex flex-col w-full max-w-2xl mx-auto py-4">
        {/* Ambient Glows */}
        <div className="relative w-full flex flex-col items-center">
          <div className="absolute -top-24 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-88 h-88 bg-tertiary/15 rounded-full blur-3xl pointer-events-none" />

          {/* Main Card */}
          <div className="relative w-full bg-surface-container/95 border border-outline-variant/40 backdrop-blur-2xl rounded-2xl shadow-2xl p-6 sm:p-10 overflow-hidden">
            {/* Top Macaw Gradient Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-secondary-container via-tertiary to-primary" />

            {/* Header with Official Emblem */}
            <div className="flex flex-col items-center text-center">
              {/* Official Emblema Badge */}
              <div className="relative group mb-3">
                <div className="absolute -inset-2 bg-gradient-to-r from-tertiary/30 via-secondary/25 to-primary/30 rounded-xl blur-lg transition duration-500 group-hover:blur-xl" />
                <div className="relative w-28 sm:w-36 h-28 sm:h-36 p-1 rounded-xl bg-surface-container-high shadow-xl flex items-center justify-center border border-tertiary/30">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEa6OWFRhuAnqRkSLT63fsRCbhtkCownVVCiNuuXqq5IiASOkU61G38QSE0yZu09rjYgyJjb-B_bREkPqUecWqofKeSHAH9-3I9nQ1AKByYaZfM272EDqAi51_mE1P--i9rjOaJ4XtQ4xubsRQjIlfLKNT7l75dKRBUOSEifV6qT4upTm-rnZOfwBmNX1Wz9PJ5Yi2k2DD4nikUpx7cYwfssYkc4rvgiHy3jd4uP63J5A7rhVZL3WWAfcNf36ayTRHOw"
                    alt="Emblema Oficial XIII Entrada Folklórica Universitaria Nacional - Trinidad Beni"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Overline Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest shadow-sm mb-2 border border-tertiary/20">
                <span
                  className="material-symbols-outlined text-tertiary text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  workspace_premium
                </span>
                <span className="font-label-sm text-tertiary tracking-wider uppercase font-bold text-xs">
                  Certamen Nacional Oficial
                </span>
              </div>

              {/* Title */}
              <h1 className="font-headline-lg text-headline-lg text-primary-fixed tracking-tight font-extrabold">
                Moperita &amp; Ñusta <span className="text-tertiary">2026</span>
              </h1>
              <p className="font-label-md text-label-md text-on-surface-variant max-w-md mt-1 font-semibold">
                Sistema de Calificación y Escrutinio Oficial de Jurados
              </p>
              <span className="font-body-sm text-secondary text-xs uppercase tracking-widest mt-1 opacity-90 font-medium">
                XIII Entrada Folklórica Universitaria Nacional • Trinidad - Beni
              </span>
            </div>

            {/* Mode Selector Tabs (Jurado / Admin) */}
            <div className="grid grid-cols-2 gap-3 mt-6" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "jurado"}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-label-md text-label-md transition-all font-bold ${
                  mode === "jurado"
                    ? "bg-primary-container text-primary-fixed border border-primary/40 shadow-lg"
                    : "bg-surface-container-high text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-highest"
                }`}
                onClick={() => {
                  setMode("jurado");
                  setError("");
                }}
              >
                <span
                  className="material-symbols-outlined text-tertiary text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  how_to_reg
                </span>
                <span>Jurado Oficial</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "admin"}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-label-md text-label-md transition-all font-bold ${
                  mode === "admin"
                    ? "bg-primary-container text-primary-fixed border border-primary/40 shadow-lg"
                    : "bg-surface-container-high text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-highest"
                }`}
                onClick={() => {
                  setMode("admin");
                  setError("");
                }}
              >
                <span
                  className="material-symbols-outlined text-secondary text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  admin_panel_settings
                </span>
                <span>Administración</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-y-5">
              {mode === "jurado" ? (
                <>
                  {/* Jury Code */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="juryCode" className="font-label-sm text-xs text-on-surface flex items-center gap-1.5 font-bold">
                        <span
                          className="material-symbols-outlined text-tertiary text-base"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          badge
                        </span>
                        CÓDIGO DE JURADO ASIGNADO
                      </label>
                      <button
                        type="button"
                        onClick={fillJuryDemo}
                        className="text-[11px] text-tertiary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">bolt</span>
                        Demo: JUR-01
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-tertiary">
                        <span className="material-symbols-outlined text-xl">key</span>
                      </div>
                      <input
                        id="juryCode"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Ej. JUR-01"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-surface-container-lowest text-on-surface font-label-md rounded-xl border border-outline-variant/50 focus:outline-none focus:border-tertiary focus:bg-surface-container-high transition-all tracking-wider placeholder:text-outline"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* PIN */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="juryPin" className="font-label-sm text-xs text-on-surface flex items-center gap-1.5 font-bold">
                        <span
                          className="material-symbols-outlined text-secondary text-base"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          lock
                        </span>
                        PIN DE SEGURIDAD (4 DÍGITOS)
                      </label>
                      <button
                        type="button"
                        onClick={fillJuryDemo}
                        className="text-[11px] text-secondary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">bolt</span>
                        PIN: 1234
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-secondary">
                        <span className="material-symbols-outlined text-xl">encrypted</span>
                      </div>
                      <input
                        id="juryPin"
                        type={showPin ? "text" : "password"}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••"
                        required
                        maxLength={8}
                        className="w-full pl-11 pr-12 py-3.5 bg-surface-container-lowest text-on-surface font-label-md rounded-xl border border-outline-variant/50 focus:outline-none focus:border-secondary focus:bg-surface-container-high transition-all tracking-widest placeholder:text-outline"
                      />
                      <button
                        type="button"
                        className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
                        onClick={() => setShowPin(!showPin)}
                        aria-label="Alternar visibilidad del PIN"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {showPin ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Admin Email */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="adminEmail" className="font-label-sm text-xs text-on-surface flex items-center gap-1.5 font-bold">
                        <span
                          className="material-symbols-outlined text-secondary text-base"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          mail
                        </span>
                        CORREO ELECTRÓNICO OFICIAL
                      </label>
                      <button
                        type="button"
                        onClick={fillAdminDemo}
                        className="text-[11px] text-secondary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">bolt</span>
                        Demo: Admin
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-secondary">
                        <span className="material-symbols-outlined text-xl">alternate_email</span>
                      </div>
                      <input
                        id="adminEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@certamen.bo"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-surface-container-lowest text-on-surface font-label-md rounded-xl border border-outline-variant/50 focus:outline-none focus:border-secondary focus:bg-surface-container-high transition-all placeholder:text-outline"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="adminPassword" className="font-label-sm text-xs text-on-surface flex items-center gap-1.5 font-bold">
                        <span
                          className="material-symbols-outlined text-tertiary text-base"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          lock
                        </span>
                        CONTRASEÑA
                      </label>
                      <button
                        type="button"
                        onClick={fillAdminDemo}
                        className="text-[11px] text-tertiary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">bolt</span>
                        Pass: admin2026
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-tertiary">
                        <span className="material-symbols-outlined text-xl">encrypted</span>
                      </div>
                      <input
                        id="adminPassword"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-12 py-3.5 bg-surface-container-lowest text-on-surface font-label-md rounded-xl border border-outline-variant/50 focus:outline-none focus:border-tertiary focus:bg-surface-container-high transition-all placeholder:text-outline"
                      />
                      <button
                        type="button"
                        className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Alternar visibilidad"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/50 text-error text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3.5 rounded-xl bg-primary-container/40 border border-primary text-primary text-sm flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Sesión autorizada. Redirigiendo al panel...</span>
                </div>
              )}

              {/* Telemetry Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-surface-container-lowest/80 rounded-lg border border-outline-variant/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald" />
                  </span>
                  <span className="text-on-surface-variant">
                    Servidor: <strong className="text-primary font-semibold">Trinidad Activo</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-tertiary font-semibold">
                  <span className="material-symbols-outlined text-xs">verified_user</span>
                  <span>Cifrado SSL 256-Bit</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-tertiary-fixed-dim via-tertiary to-tertiary-fixed text-on-tertiary-fixed font-headline-sm text-headline-sm font-extrabold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer min-h-[56px] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
                    <span>VALIDANDO CREDENCIALES...</span>
                  </>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      login
                    </span>
                    <span>INGRESAR AL SISTEMA OFICIAL</span>
                  </>
                )}
              </button>
            </form>

            {/* Institutional Security Notice */}
            <div className="mt-6 pt-4 flex items-start gap-2.5 text-left bg-surface-container-lowest/50 p-3.5 rounded-xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">gavel</span>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface">Acceso estrictamente reservado y protocolizado.</strong> Conforme al Reglamento Oficial de la XIII Entrada Folklórica Universitaria Nacional, cada registro de puntaje emitido es irrevocable, auditado y firmado con hash digital criptográfico.
              </p>
            </div>

            {/* Quick Jury Support Line */}
            <div className="mt-3 flex items-center justify-between text-xs text-outline px-1">
              <span>Soporte Técnico: Mesa Central Trinidad</span>
              <span className="flex items-center gap-1 text-primary hover:underline cursor-pointer">
                <span className="material-symbols-outlined text-sm">contact_support</span>
                Asistencia
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
