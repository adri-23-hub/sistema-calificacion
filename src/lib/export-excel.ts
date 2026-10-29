import * as XLSX from "xlsx";

export interface DanceGroupExportData {
  puesto: number | string;
  danza: string;
  fraternidad: string;
  universidad: string;
  departamento: string;
  promedioJurados: number;
  amarillas: number;
  rojas: number;
  ordenIncumplido: string;
  descuentosManuales: number;
  totalPenalizaciones: number;
  notaFinal: number;
  estado: string;
}

export interface CandidateExportData {
  puesto: number | string;
  candidata: string;
  categoria: string;
  fraternidad: string;
  pasarelaGala: number;
  pasarelaCasual: number;
  pasarelaTipica: number;
  notaFinal: number;
}

/**
 * Genera y descarga un archivo Excel (.xlsx) con los resultados oficiales de la Entrada Folklórica.
 */
export function exportResultsToExcel(options: {
  editionName: string;
  danceGroups: DanceGroupExportData[];
  candidates?: CandidateExportData[];
  filename?: string;
}): void {
  const { editionName, danceGroups, candidates, filename = "Resultados_Entrada_Folklorica_2026.xlsx" } = options;

  const wb = XLSX.utils.book_new();

  // Hoja 1: Módulo A - Grupos de Danza
  const danceRows = danceGroups.map((g) => ({
    "Puesto": g.puesto,
    "Danza": g.danza,
    "Fraternidad": g.fraternidad,
    "Universidad": g.universidad,
    "Departamento": g.departamento,
    "Promedio Jurados": g.promedioJurados,
    "Banderolas Amarillas": g.amarillas,
    "Banderolas Rojas": g.rojas,
    "Incumplió Orden": g.ordenIncumplido,
    "Descuentos Manuales": g.descuentosManuales,
    "Total Penalizaciones": g.totalPenalizaciones,
    "Nota Final": g.notaFinal,
    "Estado": g.estado,
  }));

  const wsDance = XLSX.utils.json_to_sheet(danceRows);
  XLSX.utils.book_append_sheet(wb, wsDance, "Grupos de Danza");

  // Hoja 2: Módulo B - Candidatas (si existen)
  if (candidates && candidates.length > 0) {
    const candidateRows = candidates.map((c) => ({
      "Puesto": c.puesto,
      "Candidata": c.candidata,
      "Categoría": c.categoria,
      "Fraternidad": c.fraternidad,
      "Ropa de Gala (Prom.)": c.pasarelaGala,
      "Ropa Casual (Prom.)": c.pasarelaCasual,
      "Ropa Típica (Prom.)": c.pasarelaTipica,
      "Nota Final Ponderada": c.notaFinal,
    }));
    const wsCandidates = XLSX.utils.json_to_sheet(candidateRows);
    XLSX.utils.book_append_sheet(wb, wsCandidates, "Moperita y Ñusta");
  }

  // Descarga directa en navegador
  XLSX.writeFile(wb, filename);
}
