import { PrismaClient, Role, RubricStatus, CategoryStatus, EditionStatus, EntryStatus, ModuleType, RunwayType, PenaltyType } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// Simple hash for seed data (not production-grade)
function hashPin(pin: string): string {
  const salt = createHash("sha256").update("seed-salt-dev").digest("hex").slice(0, 16);
  const hash = createHash("sha256").update(salt + pin).digest("hex");
  return `sha256:${salt}:${hash}`;
}

function hashPassword(password: string): string {
  const salt = createHash("sha256").update("seed-salt-admin").digest("hex").slice(0, 16);
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `sha256:${salt}:${hash}`;
}

// ─── 18 Fraternidades bolivianas ────────────────────────────
const FRATERNITIES = [
  { name: "Fraternidad Bolivia", university: "Universidad Mayor de San Andrés (UMSA)", faculty: "Fac. Ciencias Sociales", city: "La Paz", department: "La Paz" },
  { name: "Fraternidad Kantuta", university: "Universidad Mayor de San Simón (UMSS)", faculty: "Fac. Humanidades", city: "Cochabamba", department: "Cochabamba" },
  { name: "Fraternidad Patujú", university: "Universidad Autónoma Gabriel René Moreno (UAGRM)", faculty: "Fac. Ciencias Jurídicas", city: "Santa Cruz", department: "Santa Cruz" },
  { name: "Fraternidad Orquídea", university: "Universidad Técnica de Oruro (UTO)", faculty: "Fac. Ingeniería", city: "Oruro", department: "Oruro" },
  { name: "Fraternidad Tajibo", university: "Universidad Autónoma Tomás Frías (UATF)", faculty: "Fac. Ciencias Puras", city: "Potosí", department: "Potosí" },
  { name: "Fraternidad Toborochi", university: "Universidad Autónoma Juan Misael Saracho (UAJMS)", faculty: "Fac. Ciencias Económicas", city: "Tarija", department: "Tarija" },
  { name: "Fraternidad Motacú", university: "Universidad Autónoma del Beni José Ballivián (UABJB)", faculty: "Fac. Ciencias de la Educación", city: "Trinidad", department: "Beni" },
  { name: "Fraternidad Cusi", university: "Universidad Amazónica de Pando (UAP)", faculty: "Fac. Ciencias Agrícolas", city: "Cobija", department: "Pando" },
  { name: "Fraternidad Jacarandá", university: "Universidad Mayor Real y Pontificia de San Francisco Xavier (UMRPSFXCH)", faculty: "Fac. Derecho", city: "Sucre", department: "Chuquisaca" },
  { name: "Fraternidad Amancaya", university: "Escuela Militar de Ingeniería (EMI)", faculty: "Ingeniería de Sistemas", city: "La Paz", department: "La Paz" },
  { name: "Fraternidad Flor de Mayo", university: "Universidad Católica Boliviana (UCB)", faculty: "Fac. Comunicación Social", city: "La Paz", department: "La Paz" },
  { name: "Fraternidad Chiñi Chiñi", university: "Universidad Privada de Santa Cruz (UPSA)", faculty: "Fac. Arquitectura", city: "Santa Cruz", department: "Santa Cruz" },
  { name: "Fraternidad Suquí", university: "Universidad Nacional Siglo XX (UNSXX)", faculty: "Fac. Ciencias Mineras", city: "Llallagua", department: "Potosí" },
  { name: "Fraternidad Heliconia", university: "Universidad Privada Boliviana (UPB)", faculty: "Fac. Administración", city: "Cochabamba", department: "Cochabamba" },
  { name: "Fraternidad Qhantu", university: "Universidad Pública de El Alto (UPEA)", faculty: "Fac. Ciencias de la Salud", city: "El Alto", department: "La Paz" },
  { name: "Fraternidad Paraíso", university: "Universidad Privada Domingo Savio (UPDS)", faculty: "Fac. Ciencias Empresariales", city: "Santa Cruz", department: "Santa Cruz" },
  { name: "Fraternidad Wara Wara", university: "Universidad Nacional de Ingeniería (UNI Bolivia)", faculty: "Ingeniería Civil", city: "La Paz", department: "La Paz" },
  { name: "Fraternidad Totaí", university: "Universidad Autónoma de la Región del Chaco (UARCH)", faculty: "Fac. Ciencias Agrarias", city: "Yacuiba", department: "Tarija" },
];

// ─── Danzas bolivianas para el Módulo A ─────────────────────
const DANCES = [
  "Morenada", "Caporales", "Diablada", "Tinkus", "Tobas",
  "Kullawada", "Saya Afroboliviana", "Llamerada", "Waca Waca", "Pujllay",
  "Ch'utas", "Macheteros", "Moseñada", "Suris", "Doctorcitos",
  "Zampoñeros", "Tarqueada", "Negritos",
];

// ─── Nombres de candidatas ──────────────────────────────────
const CANDIDATE_NAMES_MOPERITA = [
  "María José Velasco Ríos", "Ana Cristina Mendoza Flores", "Valentina Rojas Guzmán",
  "Camila Fernández Paz", "Gabriela Torres Salinas", "Sofía Medina Cárdenas",
  "Isabella Chávez Montenegro", "Daniela Vargas Peña", "Luciana Morales Quiroga",
  "Andrea Pinto Salvatierra", "Carolina Justiniano Roca", "Natalia Suárez Vaca",
  "Alejandra Saucedo Montaño", "Paula Serrano Ribera", "Renata Gutiérrez Cruz",
  "Mariana Añez Terceros", "Valeria Sandóval Pereira", "Xiomara Justiniano Durán",
];

const CANDIDATE_NAMES_NUSTA = [
  "Paola Quispe Mamani", "Jhoselin Condori Choque", "Adriana Huanca Lima",
  "Estefanía Apaza Ticona", "Milenka Calle Flores", "Yessica Mamani Quisbert",
  "Ruth Colque Villca", "Nayeli Chura Poma", "Sandra Limachi Huallpa",
  "Fabiola Ticona Ramos", "Giovanna Alanoca Nina", "Carla Quisbert Mayta",
  "Tatiana Copa Gutiérrez", "Claudia Yujra Condori", "Rocío Flores Mamani",
  "Fernanda Patzi Callisaya", "Katherine Laura Quispe", "Brenda Machaca Cusi",
];

// ─── 15 Jurados ─────────────────────────────────────────────
const JURORS = [
  { name: "Dr. Roberto Aguilar Sánchez", code: "JUR-01", pin: "1234" },
  { name: "Lic. Carmen Rosa Flores", code: "JUR-02", pin: "2345" },
  { name: "Prof. Eduardo Torrez Mamani", code: "JUR-03", pin: "3456" },
  { name: "Dra. Patricia Salinas Vega", code: "JUR-04", pin: "4567" },
  { name: "Lic. Fernando Quispe Alanoca", code: "JUR-05", pin: "5678" },
  { name: "Prof. Silvia Guzmán Rojas", code: "JUR-06", pin: "6789" },
  { name: "Dr. Miguel Ángel Vargas", code: "JUR-07", pin: "7890" },
  { name: "Lic. Rosa María Condori", code: "JUR-08", pin: "8901" },
  { name: "Prof. Juan Carlos Mendoza", code: "JUR-09", pin: "9012" },
  { name: "Dra. Alicia Pinto Morales", code: "JUR-10", pin: "0123" },
  { name: "Lic. César Baldivieso Cruz", code: "JUR-11", pin: "1111" },
  { name: "Prof. Gloria Suárez Paz", code: "JUR-12", pin: "2222" },
  { name: "Dr. Héctor Salvatierra Roca", code: "JUR-13", pin: "3333" },
  { name: "Lic. Marta Rivero Saucedo", code: "JUR-14", pin: "4444" },
  { name: "Prof. Luis Arce Gutiérrez", code: "JUR-15", pin: "5555" },
];

// ─── 5 Personal de Control ──────────────────────────────────
const CONTROL_STAFF = [
  { name: "Juan Pérez Rojas", code: "CTRL-01", pin: "1234" },
  { name: "María Flores Guzmán", code: "CTRL-02", pin: "2345" },
  { name: "Pedro Mamani Quispe", code: "CTRL-03", pin: "3456" },
  { name: "Luz Marina Condori Apaza", code: "CTRL-04", pin: "4567" },
  { name: "Carlos Salvatierra Cruz", code: "CTRL-05", pin: "5678" },
];

// ─── Criterios Módulo B (4 criterios, 10 pts cada uno) ──────
const CRITERIA_MODULE_B = [
  {
    name: "Porte y Elegancia en la Pasarela",
    description: "Seguridad, carisma, contacto visual y dominio del escenario.",
    maxPoints: 10,
    weight: 0.25,
    order: 1,
    appliesToRunway: null, // aplica a todas
  },
  {
    name: "Carisma y Simpatía ante el Público",
    description: "Conexión con el público, naturalidad y expresividad.",
    maxPoints: 10,
    weight: 0.25,
    order: 2,
    appliesToRunway: null, // aplica a todas
  },
  {
    name: "Autenticidad y Respeto a las Tradiciones",
    description: "Representación de la identidad cultural y autenticidad del traje típico.",
    maxPoints: 10,
    weight: 0.25,
    order: 3,
    appliesToRunway: "TIPICA" as RunwayType, // solo pasarela típica
  },
  {
    name: "Originalidad y Estilo en la Presentación",
    description: "Creatividad, originalidad del estilo y coherencia del look.",
    maxPoints: 10,
    weight: 0.25,
    order: 4,
    appliesToRunway: "CASUAL" as RunwayType, // solo pasarela casual
  },
];

async function main() {
  console.log("🌱 Iniciando seed del Sistema de Calificación...\n");

  // ─── Clean existing data ────────────────────────────────
  await prisma.scoreItem.deleteMany();
  await prisma.score.deleteMany();
  await prisma.danceScore.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.chainState.deleteMany();
  await prisma.notaryAct.deleteMany();
  await prisma.eventConfig.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.rubric.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.runway.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.danceGroup.deleteMany();
  await prisma.juryAssignment.deleteMany();
  await prisma.fraternity.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.edition.deleteMany();

  // ─── 1. Edition ─────────────────────────────────────────
  const edition = await prisma.edition.create({
    data: {
      year: 2026,
      name: "XIII Entrada Folklórica Universitaria Nacional",
      venue: "Trinidad, Beni",
      status: EditionStatus.ACTIVE,
      scoringRule: "MEAN",
      quorum: 1.0,
      publicLiveVisibility: "HIDDEN", // "sobre cerrado" por defecto
      decimals: 2,
      autoDisqualify: false,
      resultsRevealed: false,
      startsAt: new Date("2026-11-13T08:00:00-04:00"), // viernes 13 nov
      endsAt: new Date("2026-11-16T23:59:59-04:00"),   // lunes 16 nov
    },
  });
  console.log(`✅ Edición creada: ${edition.name} (${edition.year})`);

  // ─── 2. Categories ─────────────────────────────────────
  // Módulo A: Entrada Folklórica
  const entradaFolklorica = await prisma.category.create({
    data: {
      editionId: edition.id,
      name: "Entrada Folklórica",
      slug: "entrada-folklorica",
      moduleType: ModuleType.ENTRADA_FOLKLORICA,
      region: "XIII Entrada Folklórica Universitaria Nacional — sábado 14 de noviembre 2026",
      order: 1,
      status: CategoryStatus.OPEN,
      minVotesToClose: 5,
    },
  });

  // Módulo B: Moperita
  const moperita = await prisma.category.create({
    data: {
      editionId: edition.id,
      name: "Moperita",
      slug: "moperita",
      moduleType: ModuleType.MOPERITA_NUSTA,
      region: "Danzas Típicas del Oriente, Beni y Amazonía boliviana",
      order: 2,
      status: CategoryStatus.OPEN,
      minVotesToClose: 5,
    },
  });

  // Módulo B: Ñusta
  const nusta = await prisma.category.create({
    data: {
      editionId: edition.id,
      name: "Ñusta",
      slug: "nusta",
      moduleType: ModuleType.MOPERITA_NUSTA,
      region: "Danzas Tradicionales del Altiplano, Valles e Integración",
      order: 3,
      status: CategoryStatus.OPEN,
      minVotesToClose: 5,
    },
  });
  console.log(`✅ Categorías: ${entradaFolklorica.name}, ${moperita.name} y ${nusta.name}`);

  // ─── 3. Fraternities ───────────────────────────────────
  const fraternityRecords = [];
  for (const f of FRATERNITIES) {
    const frat = await prisma.fraternity.create({
      data: {
        editionId: edition.id,
        ...f,
      },
    });
    fraternityRecords.push(frat);
  }
  console.log(`✅ ${fraternityRecords.length} fraternidades creadas`);

  // ─── 4. Módulo A: Grupos de Danza ──────────────────────
  for (let i = 0; i < fraternityRecords.length; i++) {
    await prisma.danceGroup.create({
      data: {
        editionId: edition.id,
        fraternityId: fraternityRecords[i].id,
        danceName: DANCES[i],
        numberOfDancers: 50 + Math.floor(Math.random() * 50), // 50-99 bailarines
        entryOrder: i + 1, // orden de ingreso por sorteo
        status: EntryStatus.IN_SCORING,
        hasCaratula: true,
        hasMonografia: true,
        hasDancerList: true,
        hasInvitation: i < 9, // las primeras 9 tienen carta de invitación
      },
    });
  }
  console.log(`✅ ${fraternityRecords.length} grupos de danza creados (Módulo A)`);

  // ─── 5. Módulo B: Pasarelas ────────────────────────────
  const runwayConfigs = [
    { type: RunwayType.GALA, name: "Ropa de Gala", weight: 1/3, order: 1 },
    { type: RunwayType.CASUAL, name: "Ropa Casual", weight: 1/3, order: 2 },
    { type: RunwayType.TIPICA, name: "Ropa Típica", weight: 1/3, order: 3 },
  ];

  const runwayRecords: Record<string, Record<string, { id: string; type: RunwayType }>> = {};

  for (const cat of [moperita, nusta]) {
    runwayRecords[cat.id] = {};
    for (const rw of runwayConfigs) {
      const runway = await prisma.runway.create({
        data: {
          categoryId: cat.id,
          type: rw.type,
          name: rw.name,
          weight: rw.weight,
          order: rw.order,
        },
      });
      runwayRecords[cat.id][rw.type] = { id: runway.id, type: runway.type };
    }
  }
  console.log(`✅ Pasarelas creadas (3 por categoría)`);

  // ─── 6. Módulo B: Rubrics + Criteria ───────────────────
  for (const cat of [moperita, nusta]) {
    const rubric = await prisma.rubric.create({
      data: {
        categoryId: cat.id,
        version: 1,
        status: RubricStatus.ACTIVE,
        totalPoints: 40.0,
        activatedAt: new Date(),
      },
    });

    for (const c of CRITERIA_MODULE_B) {
      await prisma.criterion.create({
        data: {
          rubricId: rubric.id,
          name: c.name,
          description: c.description,
          maxPoints: c.maxPoints,
          weight: c.weight,
          order: c.order,
          appliesToRunway: c.appliesToRunway,
        },
      });
    }

    // Set active rubric
    await prisma.category.update({
      where: { id: cat.id },
      data: { activeRubricId: rubric.id },
    });
  }
  console.log(`✅ Rúbricas y 4 criterios creados para Módulo B`);

  // ─── 7. Módulo B: Participants + Entries ───────────────
  const categories = [
    { cat: moperita, names: CANDIDATE_NAMES_MOPERITA },
    { cat: nusta, names: CANDIDATE_NAMES_NUSTA },
  ];

  for (const { cat, names } of categories) {
    for (let i = 0; i < fraternityRecords.length; i++) {
      const participant = await prisma.participant.create({
        data: {
          categoryId: cat.id,
          fraternityId: fraternityRecords[i].id,
          fullName: names[i],
          career: "Carrera Universitaria",
          isActive: true,
          isAdult: true,
          hasMatricula: true,
        },
      });

      // Crear una entry por pasarela
      for (const rwType of [RunwayType.GALA, RunwayType.CASUAL, RunwayType.TIPICA]) {
        const runway = runwayRecords[cat.id][rwType];
        await prisma.entry.create({
          data: {
            categoryId: cat.id,
            participantId: participant.id,
            runwayId: runway.id,
            order: (i * 3) + runwayConfigs.findIndex((r) => r.type === rwType) + 1,
            status: EntryStatus.IN_SCORING,
          },
        });
      }
    }
  }
  console.log(`✅ 36 participantes y ${36 * 3} entries creados (Módulo B: 3 pasarelas por candidata)`);

  // ─── 8. Admin user ─────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@certamen.bo";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin2026";

  await prisma.user.create({
    data: {
      name: "Administrador del Sistema",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${adminEmail}`);

  // ─── 9. Notario user ───────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Notario de Fe Pública Nº 4",
      email: "notario@certamen.bo",
      passwordHash: hashPassword("notario2026"),
      role: Role.NOTARIO,
      isActive: true,
    },
  });
  console.log(`✅ Notario: notario@certamen.bo`);

  // ─── 10. Jury members ──────────────────────────────────
  for (const j of JURORS) {
    const juryUser = await prisma.user.create({
      data: {
        name: j.name,
        code: j.code,
        pinHash: hashPin(j.pin),
        role: Role.JURADO,
        isActive: true,
      },
    });

    await prisma.juryAssignment.create({
      data: {
        editionId: edition.id,
        userId: juryUser.id,
        isPresident: j.code === "JUR-01",
        isActive: true,
        assignedModule: null, // ambos módulos
      },
    });
  }
  console.log(`✅ ${JURORS.length} jurados creados en panel único`);

  // ─── 11. Control staff ─────────────────────────────────
  for (const c of CONTROL_STAFF) {
    await prisma.user.create({
      data: {
        name: c.name,
        code: c.code,
        pinHash: hashPin(c.pin),
        role: Role.CONTROL,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${CONTROL_STAFF.length} personal de control creados`);

  // ─── 12. Chain States ──────────────────────────────────
  await prisma.chainState.create({
    data: { editionId: edition.id, scope: "SCORE", lastHash: "GENESIS", lastSequence: 0 },
  });
  await prisma.chainState.create({
    data: { editionId: edition.id, scope: "AUDIT", lastHash: "GENESIS", lastSequence: 0 },
  });
  console.log(`✅ Chain states inicializados`);

  // ─── 13. Default Event Config ──────────────────────────
  const defaultConfigs = [
    {
      key: "moduleA.criteria.weights",
      value: { coreografia: 0.40, vestimenta: 0.30, entusiasmo: 0.30 },
      description: "Pesos de criterios — Módulo A (Entrada Folklórica)",
    },
    {
      key: "moduleA.criteria.scale",
      value: { min: 1, max: 100 },
      description: "Escala de calificación — Módulo A",
    },
    {
      key: "moduleA.penalty.config",
      value: { yellowThreshold: 3, yellowPenalty: 5, redPenalty: 10, orderPenalty: 5 },
      description: "Configuración de penalizaciones — Módulo A",
    },
    {
      key: "moduleB.criteria.scale",
      value: { min: 1, max: 10 },
      description: "Escala de calificación — Módulo B (Moperita/Ñusta)",
    },
    {
      key: "moduleB.runway.weights",
      value: { GALA: 1/3, CASUAL: 1/3, TIPICA: 1/3 },
      description: "Pesos de pasarelas — Módulo B",
    },
    {
      key: "general.juryCount",
      value: { moduleA: 5, moduleB: 5 },
      description: "Número de jurados por módulo",
    },
    {
      key: "general.minVotes",
      value: { moduleA: 3, moduleB: 3 },
      description: "Mínimo de votos para cerrar grupo/candidata",
    },
    {
      key: "general.tieBreak",
      value: ["coreografia", "vestimenta", "entusiasmo"],
      description: "Orden de desempate (criterio de mayor peso primero)",
    },
    {
      key: "general.scoringRule",
      value: "MEAN",
      description: "Método de agregación (MEAN o TRIMMED_MEAN)",
    },
    {
      key: "general.decimals",
      value: 2,
      description: "Decimales de redondeo",
    },
  ];

  for (const cfg of defaultConfigs) {
    await prisma.eventConfig.create({
      data: {
        editionId: edition.id,
        key: cfg.key,
        value: cfg.value as object,
        description: cfg.description,
      },
    });
  }
  console.log(`✅ ${defaultConfigs.length} configuraciones por defecto creadas`);

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n📋 Credenciales de prueba:");
  console.log("   Admin:   admin@certamen.bo / admin2026");
  console.log("   Notario: notario@certamen.bo / notario2026");
  console.log("   Jurados: JUR-01 a JUR-15 (PIN: ver seed)");
  console.log("   Ejemplo: JUR-01 / PIN: 1234");
  console.log("   Control: CTRL-01 a CTRL-05 (PIN: ver seed)");
  console.log("   Ejemplo: CTRL-01 / PIN: 1234");
  console.log("\n📦 Módulos:");
  console.log("   A) Entrada Folklórica: 18 grupos de danza");
  console.log("   B) Moperita y Ñusta:  36 candidatas × 3 pasarelas");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
