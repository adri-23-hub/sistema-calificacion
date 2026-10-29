import Link from "next/link";

export default function ResultadosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">
            PORTAL OFICIAL DE RESULTADOS &nbsp;|&nbsp; XIII ENTRADA FOLKLÓRICA NACIONAL • TRINIDAD 2026
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
            >
              Acceso a Jurados y Personal →
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/resultados" className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">
              Entrada Folklórica 2026 <span className="text-amber-400">• Resultados</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/resultados"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
            >
              Resultados Oficiales
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
