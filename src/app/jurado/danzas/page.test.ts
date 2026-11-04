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
