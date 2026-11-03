/**
 * Tipos públicos de resultados en vivo.
 *
 * IMPORTANTE: este archivo se importa desde componentes cliente.
 * Solo debe contener tipos e interfaces, nunca acceso a base de datos.
 */

export type LiveDanceStatus = "PENDING" | "IN_SCORING" | "CLOSED" | "DISQUALIFIED";

export type LiveRunwayType = "GALA" | "CASUAL" | "TIPICA";

export interface LiveDanceItem {
  id: string;
  entryOrder: number | null;
  danceName: string;
  fraternityName: string;
  university: string;
  department: string;
  numberOfDancers: number;
  status: LiveDanceStatus;
  isDisqualified: boolean;
  disqualifyReason: string | null;
  votesCount: number;
  juryCount: number;
  average: number;
  penaltyTotal: number;
  finalScore: number;
  yellowFlags: number;
  redFlags: number;
  orderViolation: boolean;
  manualDeductions: number;
  rank: number | null;
  lastVoteAt: string | null;
}

export interface LiveRunwayItem {
  type: LiveRunwayType;
  name: string;
  average: number;
  weight: number;
  votesCount: number;
  juryCount: number;
}

export interface LiveCandidateItem {
  id: string;
  fullName: string;
  categoryId: string;
  categoryName: string;
  fraternityName: string;
  university: string;
  photoUrl: string | null;
  votesCount: number;
  juryCount: number;
  runways: LiveRunwayItem[];
  totalScore: number;
  rank: number | null;
  lastVoteAt: string | null;
}

export interface LiveCategoryGroup {
  id: string;
  name: string;
  status: string;
  items: LiveCandidateItem[];
}

export interface LiveCurrent {
  module: "A" | "B";
  name: string;
  fraternityName: string;
  categoryName?: string;
  votesCount: number;
  juryCount: number;
}

export interface LiveSummary {
  totalParticipants: number;
  scoredParticipants: number;
  votesEmitted: number;
  totalJurors: number;
  lastVoteAt: string | null;
}

export interface LiveModuleA {
  items: LiveDanceItem[];
  summary: LiveSummary;
  current: LiveCurrent | null;
  isFinal: boolean;
}

export interface LiveModuleB {
  categories: LiveCategoryGroup[];
  summary: LiveSummary;
  current: LiveCurrent | null;
  isFinal: boolean;
}

export interface LiveResultsPayload {
  updatedAt: string;
  edition: {
    id: string;
    name: string;
    year: number;
    venue: string;
  };
  moduleA: LiveModuleA;
  moduleB: LiveModuleB;
}

export type LiveResultsApiResponse =
  | { success: true; data: LiveResultsPayload }
  | { success: false; error: string };
