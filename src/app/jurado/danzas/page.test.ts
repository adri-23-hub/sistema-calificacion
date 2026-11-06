import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JuradoPage from "./page";

const mock = vi.hoisted(() => ({ edition: vi.fn(), groups: vi.fn(), entries: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: async () => ({ role: "JURADO", userId: "jury", name: "Jurado" }) }));
vi.mock("@/lib/db", () => ({ prisma: {
  edition: { findFirst: mock.edition }, danceGroup: { findMany: mock.groups }, entry: { findMany: mock.entries },
} }));
vi.mock("@/features/voting/components/JuryDancesClient", () => ({ default: ({ dances }: { dances: unknown[] }) => JSON.stringify(dances) }));

beforeEach(() => {
  vi.resetAllMocks();
  mock.edition.mockResolvedValue({ id: "active", year: 2026 });
  mock.groups.mockResolvedValue([]);
  mock.entries.mockResolvedValue([]);
});

describe("catálogo del jurado", () => {
  it("muestra un catálogo vacío, sin demo, si la consulta no tiene registros", async () => {
    const html = renderToStaticMarkup(await JuradoPage());
    expect(html).toContain("[]");
    expect(html).not.toContain("demostración");
    expect(mock.groups).toHaveBeenCalledWith(expect.objectContaining({ where: { editionId: "active" } }));
    expect(mock.entries).toHaveBeenCalledWith(expect.objectContaining({ where: { category: { editionId: "active" } } }));
  });

  it("tampoco inventa registros cuando no hay edición activa", async () => {
    mock.edition.mockResolvedValue(null);
    const html = renderToStaticMarkup(await JuradoPage());
    expect(html).toContain("[]");
    expect(html).not.toContain("demostración");
    expect(mock.groups).not.toHaveBeenCalled();
  });

  it("usa el respaldo demo con aviso solamente cuando falla la base", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      mock.groups.mockRejectedValue(new Error("sin conexión"));
      const html = renderToStaticMarkup(await JuradoPage());
      expect(html).toContain("catálogo de demostración");
      expect(html).not.toContain("[]");
    } finally { warn.mockRestore(); }
  });

  it("envía al cliente la URL del grupo, sin consultar el almacén de bytes", async () => {
    mock.groups.mockResolvedValue([{
      id: "group", entryOrder: 1, status: "PENDING", danceName: "Morenada",
      fraternity: { name: "Fraternidad", university: "U", city: "La Paz", department: "La Paz" },
      numberOfDancers: 80, photoUrl: "/api/images/image123", danceScores: [],
    }]);
    const html = renderToStaticMarkup(await JuradoPage());
    expect(html).toContain("/api/images/image123");
    expect(html).not.toContain("demostración");
  });
});
it("agrupa Gala, Casual y Típica en una sola candidata del catálogo", async () => {
  const base = { participantId: "participant-1", order: 1, category: { name: "Moperita", slug: "moperita", status: "OPEN", activeRubricId: "rubric" }, participant: { fullName: "Ana", photoUrl: "/api/images/photo", fraternity: { name: "F", university: "U", city: "C", department: "D" } }, votingOpensAt: null, votingClosesAt: null };
  mock.entries.mockResolvedValue([
    { ...base, id: "gala", runway: { type: "GALA" }, status: "CLOSED", scores: [{ rawTotal: 30, submittedAt: new Date(), payloadHash: "hash" }] },
    { ...base, id: "casual", runway: { type: "CASUAL" }, status: "IN_SCORING", scores: [] },
    { ...base, id: "tipica", runway: { type: "TIPICA" }, status: "PENDING", scores: [] },
  ]);
  const html = renderToStaticMarkup(await JuradoPage());
  expect(html.match(/candidateName/g)).toHaveLength(1);
  expect(html).toContain("/api/images/photo");
  expect(html).toContain("/jurado/calificar/gala");
  expect(html).toContain("/jurado/calificar/casual");
  expect(html).toContain("actaHref");
  expect(html).not.toContain("/jurado/calificar/tipica");
  expect(html).toContain("voted");
  expect(html).toContain("pending");
});
