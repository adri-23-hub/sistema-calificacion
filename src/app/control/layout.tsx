import { redirect } from "next/navigation";
import { getSession, destroySession } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function handleLogout() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || (session.role !== "CONTROL" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">
            SISTEMA OFICIAL &nbsp;|&nbsp; XIII ENTRADA FOLKLÓRICA NACIONAL • TRINIDAD 2026
          </span>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ROL: {session.role}
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/control" className="flex items-center gap-2 group">
              <span className="font-bold text-lg text-white">
                Módulo A <span className="text-amber-400">• Control de Campo</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-white">{session.name}</div>
              <div className="text-xs text-slate-400">{session.code || "CONTROL"}</div>
            </div>
            <form action={handleLogout}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 py-4 sm:py-6">{children}</main>
    </div>
  );
}
