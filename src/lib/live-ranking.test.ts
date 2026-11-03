import { describe, it, expect } from "vitest";
import {
  rankCandidateItems,
  rankDanceItems,
  summarizeLiveItems,
} from "./live-ranking";
import type { LiveCandidateItem, LiveDanceItem } from "@/features/live/types";

function dance(overrides: Partial<LiveDanceItem> & { id: string }): LiveDanceItem {
  return {
    entryOrder: null,
    danceName: `Danza ${overrides.id}`,
    fraternityName: "Fraternidad",
    university: "Universidad",
    department: "Beni",
    numberOfDancers: 60,
    status: "CLOSED",
    isDisqualified: false,
    disqualifyReason: null,
    votesCount: 3,
    juryCount: 3,
    average: 80,
    penaltyTotal: 0,
    finalScore: 80,
    yellowFlags: 0,
    redFlags: 0,
    orderViolation: false,
    manualDeductions: 0,
    rank: null,
    lastVoteAt: null,
    ...overrides,
  };
}

function candidate(
  overrides: Partial<LiveCandidateItem> & { id: string }
): LiveCandidateItem {
  return {
    fullName: `Candidata ${overrides.id}`,
    categoryId: "cat-1",
    categoryName: "Moperita",
    fraternityName: "Fraternidad",
    university: "Universidad",
    photoUrl: null,
    votesCount: 3,
    juryCount: 3,
    runways: [],
    totalScore: 80,
    rank: null,
    lastVoteAt: null,
    ...overrides,
  };
}

describe("Ranking público en vivo", () => {
  it("ordena grupos por nota final y deja pendientes/descalificados sin puesto", () => {
    const ranked = rankDanceItems([
      dance({ id: "pendiente", votesCount: 0, finalScore: 0, entryOrder: 4 }),
      dance({ id: "tercero", finalScore: 75, entryOrder: 3 }),
      dance({ id: "primero", finalScore: 92, entryOrder: 1 }),
      dance({
        id: "descalificado",
        isDisqualified: true,
        status: "DISQUALIFIED",
        finalScore: 0,
        entryOrder: 5,
      }),
      dance({ id: "segundo", finalScore: 85, entryOrder: 2 }),
    ]);

    expect(ranked.map((item) => item.id)).toEqual([
      "primero",
      "segundo",
      "tercero",
      "pendiente",
      "descalificado",
    ]);
    expect(ranked.map((item) => item.rank)).toEqual([1, 2, 3, null, null]);
  });

  it("desempata por promedio y luego por orden de ingreso", () => {
    const ranked = rankDanceItems([
      dance({ id: "b", finalScore: 80, average: 80, entryOrder: 2 }),
      dance({ id: "a", finalScore: 80, average: 80, entryOrder: 1 }),
      dance({ id: "c", finalScore: 80, average: 85, entryOrder: 3 }),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(ranked.map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it("ordena candidatas dentro de su categoría y deja sin puesto a quienes no tienen votos", () => {
    const ranked = rankCandidateItems([
      candidate({ id: "sin-votos", votesCount: 0, totalScore: 0 }),
      candidate({ id: "segunda", totalScore: 88 }),
      candidate({ id: "primera", totalScore: 94 }),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["primera", "segunda", "sin-votos"]);
    expect(ranked.map((item) => item.rank)).toEqual([1, 2, null]);
  });

  it("resume participantes, votos y último voto emitido", () => {
    const summary = summarizeLiveItems(
      [
        { votesCount: 3, lastVoteAt: "2026-11-14T10:00:00.000Z" },
        { votesCount: 0, lastVoteAt: null },
        { votesCount: 2, lastVoteAt: "2026-11-14T10:05:00.000Z" },
      ],
      5
    );

    expect(summary.totalParticipants).toBe(3);
    expect(summary.scoredParticipants).toBe(2);
    expect(summary.votesEmitted).toBe(5);
    expect(summary.totalJurors).toBe(5);
    expect(summary.lastVoteAt).toBe("2026-11-14T10:05:00.000Z");
  });
});
