import { getLiveResults } from "@/lib/live-results";
import LiveResultsClient from "@/features/live/LiveResultsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pantalla en Vivo | XIII Entrada Folklórica 2026",
  description:
    "Pantalla pública de auditorio con los resultados en vivo de la Entrada Folklórica y la Elección de Moperita y Ñusta de Bolivia 2026.",
};

export default async function VivoPage() {
  const initialData = await getLiveResults();

  if (!initialData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-xl text-center">
          <div className="text-6xl mb-4">🏛️</div>
          <h1 className="text-2xl font-black text-white">Aún no hay una edición activa</h1>
          <p className="text-sm text-slate-400 mt-2">
            La pantalla de resultados en vivo se activará cuando el comité organice la edición
            del certamen.
          </p>
        </div>
      </div>
    );
  }

  return <LiveResultsClient initialData={initialData} />;
}
