import { redirect } from "next/navigation";
import { getSession, destroySession } from "@/lib/auth";
import Link from "next/link";
import { JuradoNavDesktop, JuradoNavMobile } from "@/features/voting/components/JuradoNavClient";

export const dynamic = "force-dynamic";

async function handleLogout() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function JuradoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "JURADO") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Telemetry Bar */}
      <div className="bg-surface-container-lowest/85 border-b border-outline-variant/30 py-2 px-4 sm:px-8 xl:px-12">
        <div className="max-w-[1720px] mx-auto flex flex-wrap gap-2 justify-between items-center text-xs">
          <span className="text-on-surface-variant tracking-wide font-medium">
            SISTEMA DE CALIFICACIÓN OFICIAL 2026 &nbsp;|&nbsp; XIII ENTRADA FOLKLÓRICA UNIVERSITARIA NACIONAL • TRINIDAD - BENI
          </span>
          <div className="flex items-center gap-3">
            <span className="badge badge-gold">
              <span className="ms ms-filled text-xs">how_to_reg</span>
              JURADO
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald" />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="glass-strong border-b border-outline-variant/20 px-4 sm:px-8 xl:px-12 py-3">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/jurado" className="flex items-center gap-2 group">
              <span className="text-gradient-gold font-display font-bold text-lg">
                Moperita &amp; Ñusta
              </span>
            </Link>
            <JuradoNavDesktop />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-on-surface font-display font-semibold">{session.name}</span>
              <span className="text-on-surface-variant">{session.code}</span>
            </div>
            <form action={handleLogout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
              >
                <span className="ms text-lg">logout</span>
                <span className="hidden sm:inline font-display font-semibold">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <JuradoNavMobile />

      {/* Content */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-8 xl:px-12 py-6 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  );
}
