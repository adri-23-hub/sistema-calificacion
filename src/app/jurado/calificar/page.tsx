import DanceVotingCard from "@/features/voting/components/DanceVotingCard";
import CandidateVotingCards from "@/features/voting/components/CandidateVotingCards";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVotingChoices } from "@/lib/voting-choices";

export const dynamic = "force-dynamic";
export default async function CalificarIndexPage({ searchParams }: { searchParams: Promise<{ certamen?: string | string[] }> }) {
  const session = await getSession();
  if (!session || session.role !== "JURADO") redirect("/login");
  const params = await searchParams;
  let choices;
  try { choices = await getVotingChoices(session.userId, typeof params.certamen === "string" ? params.certamen : undefined); }
  catch { return <section className="max-w-4xl mx-auto py-10"><h1 className="text-2xl font-bold">No se pudieron cargar los certámenes</h1><p className="mt-3 text-on-surface-variant">Comprueba la conexión e intenta nuevamente. No se ha enviado ninguna calificación.</p><Link href="/jurado/calificar" className="inline-block mt-6 text-tertiary underline">Volver a intentar</Link></section>; }
  const { contests, entries, candidates, selected, message } = choices;
  return <section className="max-w-7xl mx-auto py-5 sm:py-9">
    <p className="text-xs uppercase tracking-widest text-tertiary font-bold mb-3">Votación del jurado</p>
    <h1 className="font-display text-3xl sm:text-4xl font-extrabold">¿Qué certamen deseas calificar?</h1>
    <p className="mt-3 text-on-surface-variant text-sm">Selecciona un certamen y elige una participación o pasada. Verás cuáles están abiertas, cerradas o ya calificadas. Solo puedes votar en los concursos que tienes asignados.</p>
    {message && <p role="status" className="mt-6 p-4 rounded-xl border border-tertiary/30 bg-tertiary/10 text-sm">{message}</p>}
    <nav aria-label="Certámenes disponibles" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-7">
      {contests.map(c => {
        const content = <><span aria-hidden="true" className="ms text-3xl text-tertiary">{c.icon}</span><h2 className="font-display text-xl font-bold mt-4">{c.name}</h2><p className="text-xs mt-2 text-on-surface-variant">{c.enabled ? c.id === selected?.id ? "Certamen seleccionado" : "Elegir participación →" : "No asignado a tu mesa"}</p></>;
        const style = `block p-6 rounded-2xl border transition-colors ${c.id === selected?.id ? "border-tertiary bg-tertiary/10" : "border-white/10 bg-[#0a2e1d]"}`;
        return c.enabled ? <Link key={c.id} href={`/jurado/calificar?certamen=${encodeURIComponent(c.id)}`} aria-current={c.id === selected?.id ? "page" : undefined} className={`${style} hover:border-tertiary focus-visible:outline-2 focus-visible:outline-tertiary`}>{content}</Link> : <div key={c.id} aria-disabled="true" className={`${style} opacity-50`}>{content}</div>;
      })}
    </nav>
    {selected && <section className="mt-10" aria-label="Participaciones del certamen"><div className="flex flex-wrap items-center justify-between gap-3 mb-5"><h2 className="font-display text-2xl font-bold">{selected.name} · {selected.id === "danzas" ? "Participaciones abiertas" : "Candidatas"}</h2><Link href={`/jurado/calificar?certamen=${encodeURIComponent(selected.id)}`} className="text-sm text-tertiary underline">Actualizar lista</Link></div>
      {selected.id !== "danzas" ? <CandidateVotingCards candidates={candidates} /> : entries.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{entries.map(e => <DanceVotingCard key={e.id} dance={e.card} />)}</div> : <div className="p-8 text-center rounded-2xl border border-dashed border-white/20"><h3 className="font-bold">No hay participaciones abiertas</h3><p className="text-sm text-on-surface-variant mt-2">Cuando el administrador habilite una participación, aparecerá aquí. Actualiza la lista para comprobarlo.</p></div>}
    </section>}
  </section>;
}
