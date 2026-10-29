-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'JURADO', 'NOTARIO', 'CONTROL');

-- CreateEnum
CREATE TYPE "EditionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('ENTRADA_FOLKLORICA', 'MOPERITA_NUSTA');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('DRAFT', 'OPEN', 'VOTING', 'CLOSED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'IN_SCORING', 'CLOSED');

-- CreateEnum
CREATE TYPE "RubricStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScoreStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VOID');

-- CreateEnum
CREATE TYPE "ScoringRule" AS ENUM ('MEAN', 'TRIMMED_MEAN');

-- CreateEnum
CREATE TYPE "LiveVisibility" AS ENUM ('ALWAYS', 'AFTER_ENTRY', 'AFTER_CATEGORY', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ChainScope" AS ENUM ('SCORE', 'AUDIT');

-- CreateEnum
CREATE TYPE "NotaryActStatus" AS ENUM ('DRAFT', 'SIGNED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('YELLOW_FLAG', 'RED_FLAG', 'ORDER_VIOLATION', 'MANUAL_DEDUCTION', 'DISQUALIFICATION');

-- CreateEnum
CREATE TYPE "RunwayType" AS ENUM ('GALA', 'CASUAL', 'TIPICA');

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "status" "EditionStatus" NOT NULL DEFAULT 'DRAFT',
    "scoringRule" "ScoringRule" NOT NULL DEFAULT 'MEAN',
    "quorum" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "publicLiveVisibility" "LiveVisibility" NOT NULL DEFAULT 'HIDDEN',
    "tieBreakOrder" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "autoDisqualify" BOOLEAN NOT NULL DEFAULT false,
    "resultsRevealed" BOOLEAN NOT NULL DEFAULT false,
    "adminConfirmedAt" TIMESTAMP(3),
    "adminConfirmedBy" TEXT,
    "notaryConfirmedAt" TIMESTAMP(3),
    "notaryConfirmedBy" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL DEFAULT 'MOPERITA_NUSTA',
    "region" TEXT,
    "order" INTEGER NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'DRAFT',
    "activeRubricId" TEXT,
    "minVotesToClose" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fraternity" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "faculty" TEXT,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fraternity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanceGroup" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "fraternityId" TEXT NOT NULL,
    "danceName" TEXT NOT NULL,
    "numberOfDancers" INTEGER NOT NULL,
    "entryOrder" INTEGER,
    "arrivalTime" TIMESTAMP(3),
    "arrivalRegisteredBy" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "isDisqualified" BOOLEAN NOT NULL DEFAULT false,
    "disqualifyReason" TEXT,
    "disqualifiedAt" TIMESTAMP(3),
    "disqualifiedBy" TEXT,
    "hasCaratula" BOOLEAN NOT NULL DEFAULT false,
    "hasMonografia" BOOLEAN NOT NULL DEFAULT false,
    "hasDancerList" BOOLEAN NOT NULL DEFAULT false,
    "hasInvitation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DanceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanceScore" (
    "id" TEXT NOT NULL,
    "danceGroupId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "coreografia" DOUBLE PRECISION NOT NULL,
    "vestimenta" DOUBLE PRECISION NOT NULL,
    "entusiasmo" DOUBLE PRECISION NOT NULL,
    "rawTotal" DOUBLE PRECISION NOT NULL,
    "status" "ScoreStatus" NOT NULL DEFAULT 'SUBMITTED',
    "observations" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadHash" TEXT,
    "clientUuid" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penalty" (
    "id" TEXT NOT NULL,
    "danceGroupId" TEXT NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observation" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT NOT NULL,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Penalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Runway" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "RunwayType" NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.3333,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Runway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fraternityId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "career" TEXT,
    "bio" TEXT,
    "studentId" TEXT,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "hasMatricula" BOOLEAN NOT NULL DEFAULT false,
    "musicUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "runwayId" TEXT,
    "order" INTEGER NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "votingOpensAt" TIMESTAMP(3),
    "votingClosesAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "code" TEXT,
    "passwordHash" TEXT,
    "pinHash" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedUntil" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuryAssignment" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPresident" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedModule" "ModuleType",
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JuryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "RubricStatus" NOT NULL DEFAULT 'DRAFT',
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxPoints" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "order" INTEGER NOT NULL,
    "appliesToRunway" "RunwayType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "status" "ScoreStatus" NOT NULL DEFAULT 'DRAFT',
    "rawTotal" DOUBLE PRECISION,
    "weightedTotal" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "payloadHash" TEXT,
    "previousHash" TEXT,
    "chainHash" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedBy" TEXT,
    "clientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreItem" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ScoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventConfig" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "previousHash" TEXT,
    "hash" TEXT,
    "sequence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaryAct" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "status" "NotaryActStatus" NOT NULL DEFAULT 'DRAFT',
    "finalHash" TEXT,
    "positionsSnapshot" JSONB,
    "pdfKey" TEXT,
    "notaryName" TEXT,
    "folio" TEXT,
    "verificationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaryAct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainState" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "scope" "ChainScope" NOT NULL,
    "lastHash" TEXT NOT NULL DEFAULT 'GENESIS',
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Edition_year_key" ON "Edition"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Category_editionId_slug_key" ON "Category"("editionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_editionId_order_key" ON "Category"("editionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Fraternity_editionId_name_key" ON "Fraternity"("editionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DanceGroup_editionId_entryOrder_key" ON "DanceGroup"("editionId", "entryOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DanceGroup_editionId_fraternityId_key" ON "DanceGroup"("editionId", "fraternityId");

-- CreateIndex
CREATE UNIQUE INDEX "DanceScore_clientUuid_key" ON "DanceScore"("clientUuid");

-- CreateIndex
CREATE UNIQUE INDEX "DanceScore_danceGroupId_juryId_key" ON "DanceScore"("danceGroupId", "juryId");

-- CreateIndex
CREATE UNIQUE INDEX "Runway_categoryId_type_key" ON "Runway"("categoryId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Runway_categoryId_order_key" ON "Runway"("categoryId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_categoryId_fraternityId_key" ON "Participant"("categoryId", "fraternityId");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_categoryId_participantId_runwayId_key" ON "Entry"("categoryId", "participantId", "runwayId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JuryAssignment_editionId_userId_key" ON "JuryAssignment"("editionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubric_categoryId_version_key" ON "Rubric"("categoryId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Criterion_rubricId_order_key" ON "Criterion"("rubricId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Score_clientUuid_key" ON "Score"("clientUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Score_entryId_juryId_key" ON "Score"("entryId", "juryId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreItem_scoreId_criterionId_key" ON "ScoreItem"("scoreId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventConfig_editionId_key_key" ON "EventConfig"("editionId", "key");

-- CreateIndex
CREATE INDEX "AuditLog_editionId_type_idx" ON "AuditLog"("editionId", "type");

-- CreateIndex
CREATE INDEX "AuditLog_editionId_createdAt_idx" ON "AuditLog"("editionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotaryAct_verificationCode_key" ON "NotaryAct"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "ChainState_editionId_scope_key" ON "ChainState"("editionId", "scope");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fraternity" ADD CONSTRAINT "Fraternity_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceGroup" ADD CONSTRAINT "DanceGroup_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceGroup" ADD CONSTRAINT "DanceGroup_fraternityId_fkey" FOREIGN KEY ("fraternityId") REFERENCES "Fraternity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceScore" ADD CONSTRAINT "DanceScore_danceGroupId_fkey" FOREIGN KEY ("danceGroupId") REFERENCES "DanceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceScore" ADD CONSTRAINT "DanceScore_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalty" ADD CONSTRAINT "Penalty_danceGroupId_fkey" FOREIGN KEY ("danceGroupId") REFERENCES "DanceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Runway" ADD CONSTRAINT "Runway_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_fraternityId_fkey" FOREIGN KEY ("fraternityId") REFERENCES "Fraternity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterion" ADD CONSTRAINT "Criterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreItem" ADD CONSTRAINT "ScoreItem_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "Score"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreItem" ADD CONSTRAINT "ScoreItem_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventConfig" ADD CONSTRAINT "EventConfig_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaryAct" ADD CONSTRAINT "NotaryAct_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainState" ADD CONSTRAINT "ChainState_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

