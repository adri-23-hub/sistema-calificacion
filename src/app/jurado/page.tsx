import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function JuradoMenuPage() {
  const session = await getSession();
  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  // Estadísticas del jurado y estado del certamen en vivo
  let evaluatedCount = 2;
  let totalDancesCount = 36;
  let activeEntryId = "mop-03";
  let activeEntryName = "Ariadna Melgar Saucedo (UNIVALLE)";
  let activeDanceTitle = "Danza del Sol y la Luna (Sirionó)";

  try {
    // 1. Contar evaluaciones del jurado
    const scoredCount = await prisma.score.count({
      where: {
        juryId: session.userId,
        status: "SUBMITTED",
      },
    });
    if (scoredCount > 0) evaluatedCount = scoredCount;

    // 2. Contar total de entradas
    const totalEntries = await prisma.entry.count();
    if (totalEntries > 0) totalDancesCount = totalEntries;

    // 3. Obtener danza o candidata actualmente en escenario
    const liveEntry = await prisma.entry.findFirst({
      where: { status: "IN_SCORING" },
      include: {
        participant: {
          include: { fraternity: true },
        },
        category: true,
      },
      orderBy: { order: "asc" },
    });

    if (liveEntry) {
      activeEntryId = liveEntry.id;
      activeEntryName = `${liveEntry.participant.fullName} (${liveEntry.participant.fraternity.university || liveEntry.category.name})`;
      activeDanceTitle = liveEntry.participant.fraternity.name;
    }
  } catch (error) {
    console.warn("DB query failed in JuradoMenuPage, using fallback data:", error);
  }

  return (
    <div className="min-w-0 max-w-[1400px] mx-auto py-2 sm:py-6">
      {/* Telemetry & Welcome Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden p-5 sm:p-7 rounded-3xl bg-[#0a2e1d]/60 border border-white/10 backdrop-blur-2xl shadow-2xl">
          {/* Top Gold Gradient Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-secondary-container via-tertiary to-emerald" />

          {/* Ambient Glows */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tertiary via-tertiary-fixed-dim to-secondary flex items-center justify-center p-0.5 shadow-xl">
                  <div className="w-full h-full bg-[#001208] rounded-[14px] flex items-center justify-center">
                    <span
                      className="ms text-tertiary text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      how_to_reg
                    </span>
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald flex items-center justify-center ring-2 ring-[#0a2e1d]">
                  <span className="ms text-[#001208] text-[12px] font-black">check</span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-tertiary bg-tertiary/10 border border-tertiary/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    Mesa Oficial de Jurado
                  </span>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald" />
                    </span>
                    Terminal Conectada &bull; Sincronización en Vivo
                  </span>
                </div>

                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#f4fbf6] tracking-tight">
                  Bienvenido, {session.name}
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                  Credencial Oficial: <strong className="text-tertiary">{session.code || "JUR-01"}</strong> &nbsp;|&nbsp; XIII Entrada Folklórica Universitaria Nacional &bull; Trinidad - Beni
                </p>
              </div>
            </div>

            {/* Quick Live Stats Counters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Stat 1: Evaluated */}
              <div className="flex items-center gap-3 bg-[#001208]/80 px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                <span className="ms text-tertiary text-2xl">fact_check</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block leading-tight">
                    Calificadas
                  </span>
                  <span className="font-display font-extrabold text-lg text-[#f4fbf6]">
                    {evaluatedCount} <span className="text-xs text-on-surface-variant font-normal">/ {totalDancesCount}</span>
                  </span>
                </div>
              </div>

              {/* Stat 2: Active on stage */}
              <div className="flex items-center gap-3 bg-[#001208]/80 px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                <span className="ms text-secondary text-2xl animate-pulse">broadcast_on_personal</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block leading-tight">
                    En Escenario
                  </span>
                  <span className="font-display font-bold text-xs sm:text-sm text-secondary truncate max-w-[180px] block" title={activeEntryName}>
                    {activeEntryName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Section: Votación del Jurado (4 pantallas) */}
      <section className="mb-12">
        {/* Section Header matching prototype */}
        <div className="flex items-center gap-3 mb-6">
          <span className="ms text-[32px] text-[#f5bf00]" style={{ fontVariationSettings: "'FILL' 1" }}>
            how_to_reg
          </span>
          <h2 className="font-display text-[22px] sm:text-[24px] font-bold tracking-[0.02em] text-[#f4fbf6]">
            Votación del Jurado
          </h2>
          <span className="text-[12px] text-on-surface-variant border border-white/15 rounded-full px-3 py-0.5 font-medium">
            4 pantallas
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-[#f5bf00]/45 to-transparent ml-2" />
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[18px]">
          {/* Card 01: Mi Credencial y Mesa */}
          <Link
            href="/jurado/credencial"
            className="group relative flex flex-col gap-3 bg-[#0a2e1d]/65 backdrop-blur-xl border border-white/10 rounded-[18px] p-5 sm:p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[#f5bf00]/50 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-[#f5bf00] overflow-hidden"
          >
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#f5bf00] to-transparent opacity-70" />

            <div className="flex justify-between items-start">
              <span className="font-display font-extrabold text-[15px] text-[#f5bf00] tracking-[0.1em]">
                01
              </span>
              <span className="ms text-[30px] text-[#f5bf00]">
                badge
              </span>
            </div>

            <h3 className="font-display text-[18px] font-bold text-[#f4fbf6] leading-[1.32]">
              Mi Credencial y Mesa
            </h3>

            <p className="text-on-surface-variant text-[13.5px] leading-[1.58] flex-1">
              Acceso oficial con credencial cifrada, código QR y PIN asignado para su mesa.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[#f5bf00] tracking-[0.03em] group-hover:translate-x-1 transition-transform">
                Ver credencial <span className="ms text-[17px]">arrow_forward</span>
              </span>
            </div>
          </Link>

          {/* Card 02: Lista de Danzas y Candidatas */}
          <Link
            href="/jurado/danzas"
            className="group relative flex flex-col gap-3 bg-[#0a2e1d]/65 backdrop-blur-xl border border-white/10 rounded-[18px] p-5 sm:p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[#f5bf00]/50 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-[#f5bf00] overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#f5bf00] to-transparent opacity-70" />

            <div className="flex justify-between items-start">
              <span className="font-display font-extrabold text-[15px] text-[#f5bf00] tracking-[0.1em]">
                02
              </span>
              <span className="ms text-[30px] text-[#f5bf00]">
                format_list_bulleted
              </span>
            </div>

            <h3 className="font-display text-[18px] font-bold text-[#f4fbf6] leading-[1.32]">
              Lista de Danzas y Candidatas
            </h3>

            <p className="text-on-surface-variant text-[13.5px] leading-[1.58] flex-1">
              Fraternidades y candidatas del certamen con su estado de calificación en vivo.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[#f5bf00] tracking-[0.03em] group-hover:translate-x-1 transition-transform">
                Ver programa completo <span className="ms text-[17px]">arrow_forward</span>
              </span>
            </div>
          </Link>

          {/* Card 03: Emitir Voto en Vivo */}
          <Link
            href={`/jurado/calificar/${activeEntryId}`}
            className="group relative flex flex-col gap-3 bg-[#0a2e1d]/80 backdrop-blur-xl border border-tertiary/40 rounded-[18px] p-5 sm:p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[#f5bf00] hover:shadow-[0_20px_45px_-15px_rgba(245,191,0,0.3)] focus-visible:outline-2 focus-visible:outline-[#f5bf00] overflow-hidden ring-1 ring-tertiary/20"
          >
            {/* Top gold bar with pulse */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#f5bf00] via-[#ffdf94] to-transparent" />

            <div className="flex justify-between items-start">
              <span className="font-display font-extrabold text-[15px] text-[#f5bf00] tracking-[0.1em]">
                03
              </span>
              <span className="ms text-[32px] text-[#f5bf00]" style={{ fontVariationSettings: "'FILL' 1" }}>
                how_to_vote
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[19px] font-extrabold text-[#f4fbf6] leading-[1.32] group-hover:text-tertiary transition-colors">
                  Emitir Voto en Vivo
                </h3>
              </div>
              {/* Badge indicando danza actual en escenario */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald px-2.5 py-0.5 rounded-full bg-emerald/15 border border-emerald/40 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald -ml-3" />
                En Escenario: {activeDanceTitle.slice(0, 24)}...
              </span>
            </div>

            <p className="text-on-surface-variant text-[13.5px] leading-[1.58] flex-1">
              Puntaje táctil por los 4 criterios oficiales (40 pts máx.) con confirmación cifrada.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-tertiary text-on-tertiary font-display font-extrabold text-[13px] tracking-[0.03em] shadow-md group-hover:brightness-110 group-hover:translate-x-1 transition-all">
                Votar Ahora <span className="ms text-[17px]">arrow_forward</span>
              </span>
            </div>
          </Link>

          {/* Card 04: Mis Votos Emitidos */}
          <Link
            href="/jurado/mis-calificaciones"
            className="group relative flex flex-col gap-3 bg-[#0a2e1d]/65 backdrop-blur-xl border border-white/10 rounded-[18px] p-5 sm:p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[#f5bf00]/50 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-[#f5bf00] overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#f5bf00] to-transparent opacity-70" />

            <div className="flex justify-between items-start">
              <span className="font-display font-extrabold text-[15px] text-[#f5bf00] tracking-[0.1em]">
                04
              </span>
              <span className="ms text-[30px] text-[#f5bf00]">
                fact_check
              </span>
            </div>

            <h3 className="font-display text-[18px] font-bold text-[#f4fbf6] leading-[1.32]">
              Mis Votos Emitidos
            </h3>

            <p className="text-on-surface-variant text-[13.5px] leading-[1.58] flex-1">
              Dashboard de progreso del jurado: danzas calificadas, pendientes y recibos cifrados.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[#f5bf00] tracking-[0.03em] group-hover:translate-x-1 transition-transform">
                Ver mis calificaciones <span className="ms text-[17px]">arrow_forward</span>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Secondary Section: Resultados en Vivo para el Público (2 pantallas) */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="ms text-[30px] text-[#5aa9ff]">
            cast
          </span>
          <h2 className="font-display text-[20px] sm:text-[22px] font-bold tracking-[0.02em] text-[#f4fbf6]">
            Resultados en Vivo para el Público
          </h2>
          <span className="text-[12px] text-on-surface-variant border border-white/15 rounded-full px-3 py-0.5 font-medium">
            2 pantallas
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-[#5aa9ff]/45 to-transparent ml-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
          {/* Card 05: Pantalla Auditorio */}
          <Link
            href="/resultados"
            className="group relative flex flex-col gap-3 bg-[#0a2e1d]/50 backdrop-blur-xl border border-white/10 rounded-[18px] p-5 sm:p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[#5aa9ff]/50 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-[#5aa9ff] overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#5aa9ff] to-transparent opacity-70" />

            <div className="flex justify-between items-start">
              <span className="font-display font-extrabold text-[15px] text-[#5aa9ff] tracking-[0.1em]">
                05
              </span>
              <span className="ms text-[30px] text-[#5aa9ff]">
                cast
              </span>
            </div>

            <h3 className="font-display text-[18px] font-bold text-[#f4fbf6] leading-[1.32]">
              Pantalla Auditorio (Tiempo Real)
            </h3>

            <p className="text-on-surface-variant text-[13.5px] leading-[1.58] flex-1">
              Proyección gigante en vivo para el escenario: tabla de posiciones y podio en tiempo real.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[#5aa9ff] tracking-[0.03em] group-hover:translate-x-1 transition-transform">
                Ver pantalla <span className="ms text-[17px]">arrow_forward</span>
              </span>
            </div>
          </Link>

          {/* Card 06: Resultados Finales y Podio */}
          <Link
            href="/resultados"
            className="group relative flex flex-col gap-3 bg-[#0a2e1d]/50 backdrop-blur-xl border border-white/10 rounded-[18px] p-5 sm:p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[#5aa9ff]/50 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-[#5aa9ff] overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#5aa9ff] to-transparent opacity-70" />

            <div className="flex justify-between items-start">
              <span className="font-display font-extrabold text-[15px] text-[#5aa9ff] tracking-[0.1em]">
                06
              </span>
              <span className="ms text-[30px] text-[#5aa9ff]">
                workspace_premium
              </span>
            </div>

            <h3 className="font-display text-[18px] font-bold text-[#f4fbf6] leading-[1.32]">
              Resultados Finales y Podio
            </h3>

            <p className="text-on-surface-variant text-[13.5px] leading-[1.58] flex-1">
              Escrutinio oficial, podio de coronación, premios especiales y acta notariada.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[#5aa9ff] tracking-[0.03em] group-hover:translate-x-1 transition-transform">
                Ver pantalla <span className="ms text-[17px]">arrow_forward</span>
              </span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
