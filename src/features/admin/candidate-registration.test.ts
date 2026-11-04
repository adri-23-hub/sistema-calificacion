import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { createParticipantAction } from "./actions";

const mock = vi.hoisted(() => ({
  session: vi.fn(), revalidate: vi.fn(),
  db: {
    edition: { findFirst: vi.fn() }, category: { findUnique: vi.fn() },
    fraternity: { findUnique: vi.fn() }, participant: { findUnique: vi.fn(), create: vi.fn() },
    entry: { aggregate: vi.fn() }, storedImage: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() }, $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth", () => ({ requireSession: mock.session }));
vi.mock("@/lib/db", () => ({ prisma: mock.db }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));

const input = { editionId: "active", categoryId: "moperita", fraternityId: "frat", fullName: "  Ana María de Prueba  ", career: " Turismo ", photoUrl: "/api/images/photo", isAdult: true, hasMatricula: true };
const category = { id: "moperita", editionId: "active", name: "Moperita", slug: "moperita", moduleType: "MOPERITA_NUSTA", status: "OPEN", runways: [
  { id: "gala", type: "GALA" }, { id: "casual", type: "CASUAL" }, { id: "tipica", type: "TIPICA" },
] };

beforeEach(() => {
  vi.resetAllMocks();
  mock.session.mockResolvedValue({ userId: "admin", role: "ADMIN" });
  mock.db.edition.findFirst.mockResolvedValue({ id: "active" });
  mock.db.category.findUnique.mockResolvedValue(category);
  mock.db.fraternity.findUnique.mockResolvedValue({ id: "frat", editionId: "active", name: "Fraternidad", university: "Universidad" });
  mock.db.participant.findUnique.mockResolvedValue(null);
  mock.db.participant.create.mockImplementation(async ({ data }) => ({ ...data, id: "candidate" }));
  mock.db.entry.aggregate.mockResolvedValue({ _max: { order: 54 } });
  mock.db.storedImage.findUnique.mockResolvedValue({ id: "photo" });
  mock.db.$transaction.mockImplementation((fn) => fn(mock.db));
});

describe("inscripción de Moperita y Ñusta", () => {
  it("crea candidata, tres pasadas consecutivas y auditoría en una transacción", async () => {
    const result = await createParticipantAction(input);
    expect(result.success).toBe(true);
    expect(result.candidate).toMatchObject({ fullName: "Ana María de Prueba", career: "Turismo", categorySlug: "moperita", fraternityId: "frat" });
    expect(mock.db.participant.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      categoryId: "moperita", fraternityId: "frat", photoUrl: "/api/images/photo", isAdult: true, hasMatricula: true,
      entries: { create: [
        { categoryId: "moperita", runwayId: "gala", order: 55, status: "PENDING" },
        { categoryId: "moperita", runwayId: "casual", order: 56, status: "PENDING" },
        { categoryId: "moperita", runwayId: "tipica", order: 57, status: "PENDING" },
      ] },
    }) });
    expect(mock.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mock.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: "admin", entityId: "candidate", type: "PARTICIPANT_CREATED" }) });
    expect(mock.revalidate).toHaveBeenCalledWith("/jurado", "layout");
  });

  it("admite la misma fraternidad en Ñusta y Moperita, usando la unicidad por categoría", async () => {
    mock.db.category.findUnique.mockResolvedValue({ ...category, id: "nusta", slug: "nusta", name: "Ñusta" });
    const result = await createParticipantAction({ ...input, categoryId: "nusta" });
    expect(result.candidate?.categorySlug).toBe("nusta");
    expect(mock.db.participant.findUnique).toHaveBeenCalledWith({ where: { categoryId_fraternityId: { categoryId: "nusta", fraternityId: "frat" } }, select: { id: true } });
  });

  it("rechaza otra candidata de la misma fraternidad en la misma categoría", async () => {
    mock.db.participant.findUnique.mockResolvedValue({ id: "existing", isActive: false });
    expect((await createParticipantAction(input)).error).toContain("ya tiene una candidata");
    expect(mock.db.participant.create).not.toHaveBeenCalled();
    expect(mock.db.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(["GALA", "CASUAL", "TIPICA"])("no crea registros si falta la pasada %s", async (type) => {
    mock.db.category.findUnique.mockResolvedValue({ ...category, runways: category.runways.filter((r) => r.type !== type) });
    expect((await createParticipantAction(input)).error).toContain("Configura las pasadas");
    expect(mock.db.participant.create).not.toHaveBeenCalled();
  });

  it.each([
    { status: "CLOSED" }, { editionId: "other" }, { moduleType: "ENTRADA_FOLKLORICA" }, { slug: "otra" },
  ])("rechaza categorías fuera de alcance: %j", async (change) => {
    mock.db.category.findUnique.mockResolvedValue({ ...category, ...change });
    expect((await createParticipantAction(input)).success).toBe(false);
    expect(mock.db.participant.create).not.toHaveBeenCalled();
  });

  it("rechaza formularios de una edición anterior y fraternidades ajenas", async () => {
    mock.db.edition.findFirst.mockResolvedValueOnce({ id: "new-active" });
    expect((await createParticipantAction(input)).error).toContain("edición activa cambió");
    mock.db.fraternity.findUnique.mockResolvedValue({ id: "frat", editionId: "old" });
    expect((await createParticipantAction(input)).error).toContain("fraternidad no pertenece");
    expect(mock.db.participant.create).not.toHaveBeenCalled();
  });

  it("permite foto opcional y turnos iniciales sin entradas previas", async () => {
    mock.db.entry.aggregate.mockResolvedValue({ _max: { order: null } });
    expect((await createParticipantAction({ ...input, photoUrl: null })).success).toBe(true);
    expect(mock.db.participant.create.mock.calls[0][0].data.entries.create.map((entry: { order: number }) => entry.order)).toEqual([1, 2, 3]);
    expect(mock.db.storedImage.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza nombre vacío, URL externa e imagen inexistente", async () => {
    expect((await createParticipantAction({ ...input, fullName: "   " })).success).toBe(false);
    expect((await createParticipantAction({ ...input, photoUrl: "https://otro.test/foto.jpg" })).success).toBe(false);
    mock.db.storedImage.findUnique.mockResolvedValue(null);
    expect((await createParticipantAction(input)).error).toContain("fotografía no existe");
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["JURADO", "CONTROL", "NOTARIO"])("impide registrar al rol %s", async (role) => {
    mock.session.mockResolvedValue({ role });
    expect((await createParticipantAction(input)).success).toBe(false);
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });

  it("reintenta una colisión de transacciones sin perder las tres pasadas", async () => {
    mock.db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "test" }));
    expect((await createParticipantAction(input)).success).toBe(true);
    expect(mock.db.$transaction).toHaveBeenCalledTimes(2);
    expect(mock.db.participant.create).toHaveBeenCalledTimes(1);
  });

  it("traduce un duplicado concurrente en un mensaje de formulario", async () => {
    mock.db.participant.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" }));
    expect((await createParticipantAction(input)).error).toContain("ya tiene una candidata");
    expect(mock.db.auditLog.create).not.toHaveBeenCalled();
  });
});
