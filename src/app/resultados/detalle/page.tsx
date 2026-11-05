import { getLiveResults } from "@/lib/live-results";
import ResultadosClient from "@/features/resultados/ResultadosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resultados en Vivo | XIII Entrada Folklórica 2026",
  description:
    "Resultados oficiales en tiempo real de la XIII Entrada Folklórica Nacional y la Elección de Moperita y Ñusta de Bolivia 2026.",
};

export default async function ResultadosPage() {
  const initialData = await getLiveResults();

  if (!initialData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🏛️</div>
        <h1 className="text-2xl font-bold text-white">Aún no hay una edición activa</h1>
        <p className="text-sm text-slate-400 mt-2">
          Los resultados aparecerán automáticamente cuando el comité organice la edición del
          certamen.
        </p>
      </div>
    );
  }

  return <ResultadosClient initialData={initialData} />;
}
