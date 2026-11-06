import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ entry: vi.fn(), existing: vi.fn(), assignment: vi.fn(), rubric: vi.fn(), create: vi.fn(), audit: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: async () => ({ userId: "j", role: "JURADO" }) }));
vi.mock("@/lib/db", () => { const tx = { entry: { findUnique: m.entry }, score: { findFirst: m.existing, create: m.create }, juryAssignment: { findUnique: m.assignment }, rubric: { findUnique: m.rubric }, auditLog: { create: m.audit }, $queryRaw: m.lock }; return { prisma: { $transaction: (fn: (t: unknown) => unknown) => fn(tx) } }; });
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { submitScoreAction } from "./actions";
const input = { entryId: "e", rubricId: "r", items: [{ criterionId: "c", points: 8 }] };
const entry = { id: "e", categoryId: "cat", status: "IN_SCORING", category: { editionId: "ed", moduleType: "MOPERITA_NUSTA", status: "OPEN", activeRubricId: "r" }, participant: { isActive: true } };
beforeEach(() => { vi.resetAllMocks(); m.entry.mockResolvedValue(entry); m.existing.mockResolvedValue(null); m.assignment.mockResolvedValue({ isActive: true, edition: { status: "ACTIVE" }, user: { isActive: true, role: "JURADO" }, assignedModule: null }); m.rubric.mockResolvedValue({ status: "ACTIVE", categoryId: "cat", criteria: [{ id: "c", maxPoints: 10, weight: 1 }] }); m.create.mockResolvedValue({ id: "persisted" }); });
it("no confirma una participación inexistente", async () => { m.entry.mockResolvedValue(null); expect((await submitScoreAction(input)).success).toBe(false); expect(m.create).not.toHaveBeenCalled(); });
it("no confirma una escritura fallida", async () => { m.create.mockRejectedValue(new Error("offline")); expect((await submitScoreAction(input)).success).toBe(false); });
it("confirma solo después de guardar voto y auditoría", async () => { expect(await submitScoreAction(input)).toMatchObject({ success: true, scoreId: "persisted" }); expect(m.audit).toHaveBeenCalled(); m.audit.mockRejectedValue(new Error("offline")); expect((await submitScoreAction(input)).success).toBe(false); });
it.each([NaN, Infinity, -1, 11])("rechaza nota %s", async points => { expect((await submitScoreAction({ ...input, items: [{ criterionId: "c", points }] })).success).toBe(false); expect(m.create).not.toHaveBeenCalled(); });
it.each([null, { isActive: false }, { isActive: true, edition: { status: "CLOSED" } }, { isActive: true, edition: { status: "ACTIVE" }, user: { isActive: true, role: "JURADO" }, assignedModule: "ENTRADA_FOLKLORICA" }])("rechaza asignación %j", async assignment => { m.assignment.mockResolvedValue(assignment); expect((await submitScoreAction(input)).success).toBe(false); expect(m.create).not.toHaveBeenCalled(); });
it.each([{ status: "CLOSED" }, { votingOpensAt: new Date(Date.now()+60000) }, { votingClosesAt: new Date(0) }])("rechaza votación fuera de plazo %j", async change => { m.entry.mockResolvedValue({ ...entry, ...change }); expect((await submitScoreAction(input)).success).toBe(false); });
it("rechaza criterios ajenos o duplicados", async () => { for (const items of [[{ criterionId: "other", points: 8 }], [...input.items, ...input.items]]) expect((await submitScoreAction({ ...input, items })).success).toBe(false); expect(m.create).not.toHaveBeenCalled(); });
it("acepta los cuatro criterios aunque algunos estén restringidos a una pasarela", async () => {
  const criteria = [
    { id: "c1", maxPoints: 10, weight: 0.25, appliesToRunway: null },
    { id: "c2", maxPoints: 10, weight: 0.25, appliesToRunway: null },
    { id: "c3", maxPoints: 10, weight: 0.25, appliesToRunway: "TIPICA" },
    { id: "c4", maxPoints: 10, weight: 0.25, appliesToRunway: "CASUAL" },
  ];
  m.entry.mockResolvedValue({ ...entry, runway: { type: "CASUAL" } });
  m.rubric.mockResolvedValue({ status: "ACTIVE", categoryId: "cat", criteria });
  const items = criteria.map(c => ({ criterionId: c.id, points: 8 }));
  expect(await submitScoreAction({ ...input, items })).toMatchObject({ success: true, scoreId: "persisted" });
  expect(m.create).toHaveBeenCalledTimes(1);
});
it("rechaza si falta uno de los criterios de la rúbrica", async () => {
  const criteria = [
    { id: "c1", maxPoints: 10, weight: 0.25, appliesToRunway: null },
    { id: "c2", maxPoints: 10, weight: 0.25, appliesToRunway: null },
    { id: "c3", maxPoints: 10, weight: 0.25, appliesToRunway: "TIPICA" },
    { id: "c4", maxPoints: 10, weight: 0.25, appliesToRunway: "CASUAL" },
  ];
  m.entry.mockResolvedValue({ ...entry, runway: { type: "CASUAL" } });
  m.rubric.mockResolvedValue({ status: "ACTIVE", categoryId: "cat", criteria });
  const items = criteria.slice(0, 3).map(c => ({ criterionId: c.id, points: 8 }));
  expect((await submitScoreAction({ ...input, items })).success).toBe(false);
  expect(m.create).not.toHaveBeenCalled();
});
