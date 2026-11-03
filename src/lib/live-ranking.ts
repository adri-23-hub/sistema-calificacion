import type {
  LiveCandidateItem,
  LiveDanceItem,
  LiveSummary,
} from "@/features/live/types";

/**
 * Funciones puras de ordenamiento y ranking para la vista pública en vivo.
 * No acceden a base de datos, para poder probarlas de forma aislada.
 */

function entryOrderValue(item: { entryOrder: number | null }): number {
  return item.entryOrder ?? Number.MAX_SAFE_INTEGER;
}

function latestDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Ordena y asigna puestos a los grupos de danza.
 *
 * Reglas:
 * - Los grupos con votos y no descalificados se ordenan por nota final.
 * - Los empates se resuelven por promedio y luego por orden de ingreso.
 * - Los grupos sin votos y los descalificados quedan al final, sin puesto.
 */
export function rankDanceItems(items: LiveDanceItem[]): LiveDanceItem[] {
  const copy = items.map((item) => ({ ...item }));

  const scored = copy
    .filter((item) => !item.isDisqualified && item.votesCount > 0)
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        b.average - a.average ||
        entryOrderValue(a) - entryOrderValue(b)
    );

  scored.forEach((item, index) => {
    item.rank = index + 1;
  });

  const pending = copy
    .filter((item) => !item.isDisqualified && item.votesCount === 0)
    .sort((a, b) => entryOrderValue(a) - entryOrderValue(b));

  pending.forEach((item) => {
    item.rank = null;
  });

  const disqualified = copy
    .filter((item) => item.isDisqualified)
    .sort((a, b) => entryOrderValue(a) - entryOrderValue(b));

  disqualified.forEach((item) => {
    item.rank = null;
  });

  return [...scored, ...pending, ...disqualified];
}

/**
 * Ordena y asigna puestos dentro de una categoría de candidatas.
 * Las candidatas sin votos quedan al final, sin puesto.
 */
export function rankCandidateItems(items: LiveCandidateItem[]): LiveCandidateItem[] {
  const copy = items.map((item) => ({ ...item }));

  const scored = copy
    .filter((item) => item.votesCount > 0)
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        b.votesCount - a.votesCount ||
        a.fullName.localeCompare(b.fullName, "es")
    );

  scored.forEach((item, index) => {
    item.rank = index + 1;
  });

  const pending = copy
    .filter((item) => item.votesCount === 0)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

  pending.forEach((item) => {
    item.rank = null;
  });

  return [...scored, ...pending];
}

/**
 * Construye el resumen de participación y votos de un módulo.
 */
export function summarizeLiveItems(
  items: Array<{ votesCount: number; lastVoteAt: string | null }>,
  totalJurors: number
): LiveSummary {
  let votesEmitted = 0;
  let scoredParticipants = 0;
  let lastVoteAt: string | null = null;

  for (const item of items) {
    votesEmitted += item.votesCount;
    if (item.votesCount > 0) scoredParticipants += 1;
    lastVoteAt = latestDate(lastVoteAt, item.lastVoteAt);
  }

  return {
    totalParticipants: items.length,
    scoredParticipants,
    votesEmitted,
    totalJurors,
    lastVoteAt,
  };
}

export { latestDate };
