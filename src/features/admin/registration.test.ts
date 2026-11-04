import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFraternityAction, createDanceGroupAction, updateDanceGroupAction, setParticipantPhotoAction } from "./actions";

const mock = vi.hoisted(() => {
  const group = { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  return {
    session: vi.fn(),
    db: {
      edition: { findFirst: vi.fn() },
      fraternity: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
      danceGroup: group,
      participant: { findUnique: vi.fn(), update: vi.fn() },
      storedImage: { findUnique: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});
vi.mock("@/lib/auth", () => ({ requireSession: mock.session }));
vi.mock("@/lib/db", () => ({ prisma: mock.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const dance = { editionId: "active", fraternityId: "frat", danceName: "Morenada", numberOfDancers: 80, entryOrder: 3 };
const fraternity = { editionId: "active", name: "Fraternidad de prueba", university: "Universidad", city: "La Paz", department: "La Paz" };

beforeEach(() => {
  vi.resetAllMocks();
  mock.session.mockResolvedValue({ userId: "admin", role: "ADMIN" });
  mock.db.edition.findFirst.mockResolvedValue({ id: "active", year: 2026 });
  mock.db.fraternity.findUnique.mockResolvedValue({ id: "frat", editionId: "active", name: "Fraternidad" });
  mock.db.danceGroup.findUnique.mockResolvedValue({ id: "group", editionId: "active", fraternityId: "frat", entryOrder: 3 });
  mock.db.danceGroup.create.mockResolvedValue({ id: "newgroup" });
  mock.db.fraternity.create.mockResolvedValue({ id: "newfrat", university: "Universidad" });
  mock.db.storedImage.findUnique.mockResolvedValue({ id: "image" });
  mock.db.participant.findUnique.mockResolvedValue({ id: "candidate", fullName: "Candidata", category: { editionId: "active" } });
  mock.db.$transaction.mockImplementation((fn) => fn(mock.db));
});

describe("registro en la edición activa (sin base de datos real)", () => {
  it("filtra ACTIVE y registra fraternidad con logo y auditoría", async () => {
    expect((await createFraternityAction({ ...fraternity, logoUrl: "/api/images/image" })).success).toBe(true);
    expect(mock.db.edition.findFirst).toHaveBeenCalledWith({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } });
    expect(mock.db.fraternity.create).toHaveBeenCalledWith({ data: expect.objectContaining({ editionId: "active", logoUrl: "/api/images/image" }) });
    expect(mock.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityId: "newfrat", type: "FRATERNITY_CREATED" }) });
  });

  it("no escribe cuando no hay edición activa o el formulario pertenece a otra edición", async () => {
    mock.db.edition.findFirst.mockResolvedValue(null);
    expect((await createFraternityAction(fraternity)).error).toContain("No hay una edición activa");
    expect((await createDanceGroupAction(dance)).success).toBe(false);
    mock.db.edition.findFirst.mockResolvedValue({ id: "another" });
    expect((await createDanceGroupAction(dance)).error).toContain("edición activa cambió");
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza fraternidad de otra edición y duplicados de fraternidad u orden", async () => {
    mock.db.fraternity.findUnique.mockResolvedValueOnce({ id: "frat", editionId: "old" });
    expect((await createDanceGroupAction(dance)).success).toBe(false);
    mock.db.danceGroup.findFirst.mockResolvedValueOnce({ id: "other" });
    expect((await createDanceGroupAction(dance)).error).toContain("ya tiene una danza");
    mock.db.danceGroup.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "other" });
    expect((await createDanceGroupAction(dance)).error).toContain("orden de ingreso");
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });

  it("conserva foto y checklist omitidos, y permite quitar explícitamente la foto", async () => {
    expect((await updateDanceGroupAction({ ...dance, danceGroupId: "group" })).success).toBe(true);
    const saved = mock.db.danceGroup.update.mock.calls[0][0].data;
    expect(saved).not.toHaveProperty("photoUrl");
    expect(saved).not.toHaveProperty("hasCaratula");
    expect((await updateDanceGroupAction({ ...dance, danceGroupId: "group", photoUrl: null, hasCaratula: true, hasMonografia: false })).success).toBe(true);
    expect(mock.db.danceGroup.update).toHaveBeenLastCalledWith({ where: { id: "group" }, data: expect.objectContaining({ photoUrl: null, hasCaratula: true, hasMonografia: false }) });
  });

  it("no permite editar danzas de una edición que ya no está activa", async () => {
    mock.db.danceGroup.findUnique.mockResolvedValue({ id: "group", editionId: "old" });
    expect((await updateDanceGroupAction({ ...dance, danceGroupId: "group" })).success).toBe(false);
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });

  it("guarda foto de candidata y auditoría, rechazando imágenes inexistentes o rutas externas", async () => {
    const input = { participantId: "candidate", photoUrl: "/api/images/image" };
    expect((await setParticipantPhotoAction(input)).success).toBe(true);
    expect(mock.db.participant.update).toHaveBeenCalledWith({ where: { id: "candidate" }, data: { photoUrl: input.photoUrl } });
    expect(mock.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "PARTICIPANT_PHOTO_UPDATED", entityId: "candidate" }) });
    mock.db.storedImage.findUnique.mockResolvedValue(null);
    expect((await setParticipantPhotoAction(input)).success).toBe(false);
    expect((await setParticipantPhotoAction({ ...input, photoUrl: "https://otro.test/foto.jpg" })).success).toBe(false);
    expect(mock.db.participant.update).toHaveBeenCalledTimes(1);
  });

  it.each(["JURADO", "CONTROL", "NOTARIO"])("rechaza cambios de rol %s", async (role) => {
    mock.session.mockResolvedValue({ userId: "other", role });
    expect((await createDanceGroupAction(dance)).success).toBe(false);
    expect((await setParticipantPhotoAction({ participantId: "candidate", photoUrl: null })).success).toBe(false);
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });
});
