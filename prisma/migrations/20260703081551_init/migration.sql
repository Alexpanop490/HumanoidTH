-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('SEED', 'RSS', 'GDELT', 'YOUTUBE', 'OPENALEX', 'GITHUB', 'MANUAL_SOCIAL', 'SUBMISSION', 'WEB');

-- CreateEnum
CREATE TYPE "RelevanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('QUEUED', 'FETCHING', 'ANALYZED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'RESEARCHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PullStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED_MISSING_KEY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "author" TEXT,
    "platform" TEXT,
    "rawMeta" JSONB NOT NULL DEFAULT '{}',
    "relevanceStatus" "RelevanceStatus" NOT NULL DEFAULT 'PENDING',
    "relevanceReason" TEXT,
    "relevanceConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotModel" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "developerOrg" TEXT,
    "countryOfOrigin" TEXT,
    "robotType" TEXT NOT NULL DEFAULT 'unknown',
    "embodimentLevel" TEXT,
    "primaryUseCase" TEXT,
    "thailandStatus" TEXT NOT NULL DEFAULT 'observed_in_thailand',
    "statusConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "officialUrl" TEXT,
    "description" TEXT,
    "sourceMeta" JSONB NOT NULL DEFAULT '{}',
    "firstSeenYear" INTEGER,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "sourceMeta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "contributorName" TEXT,
    "contributorType" TEXT,
    "organization" TEXT,
    "contributionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "relatedRobotModelId" TEXT,
    "sourceUrl" TEXT,
    "license" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "verificationStatus" "ReviewStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerspectiveAnnotation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "stance" TEXT NOT NULL DEFAULT 'unclear',
    "sentiment" TEXT NOT NULL DEFAULT 'unclear',
    "perspectiveTheme" TEXT NOT NULL DEFAULT 'unclear',
    "targetEntity" TEXT NOT NULL DEFAULT 'humanoid/social robotics',
    "evidenceExcerpt" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerspectiveAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Triplet" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Triplet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatsCache" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatsCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SubmittedData" (
    "id" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "submitterName" TEXT,
    "submitterContact" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'QUEUED',
    "reviewNotes" TEXT,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmittedData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "pipelineName" TEXT NOT NULL,
    "status" "PullStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "detailsJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcePullJob" (
    "id" TEXT NOT NULL,
    "adapter" "SourceType" NOT NULL,
    "query" TEXT NOT NULL,
    "status" "PullStatus" NOT NULL DEFAULT 'QUEUED',
    "recordsFound" INTEGER NOT NULL DEFAULT 0,
    "recordsSaved" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcePullJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedInventory" (
    "id" TEXT NOT NULL,
    "robotModelId" TEXT,
    "displayName" TEXT NOT NULL,
    "ownershipStatus" TEXT NOT NULL,
    "ownerOrg" TEXT,
    "custodian" TEXT,
    "locationLabel" TEXT,
    "serialNumber" TEXT,
    "publicSerialSafe" BOOLEAN NOT NULL DEFAULT false,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionSource" TEXT,
    "conditionStatus" TEXT,
    "firmwareVersion" TEXT,
    "accessories" JSONB NOT NULL DEFAULT '[]',
    "documentationLinks" JSONB NOT NULL DEFAULT '[]',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnedInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRecord_url_key" ON "SourceRecord"("url");

-- CreateIndex
CREATE INDEX "SourceRecord_sourceType_idx" ON "SourceRecord"("sourceType");

-- CreateIndex
CREATE INDEX "SourceRecord_relevanceStatus_idx" ON "SourceRecord"("relevanceStatus");

-- CreateIndex
CREATE INDEX "SourceRecord_publishedAt_idx" ON "SourceRecord"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RobotModel_canonicalName_key" ON "RobotModel"("canonicalName");

-- CreateIndex
CREATE INDEX "RobotModel_robotType_idx" ON "RobotModel"("robotType");

-- CreateIndex
CREATE INDEX "RobotModel_thailandStatus_idx" ON "RobotModel"("thailandStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_canonicalKey_key" ON "Entity"("canonicalKey");

-- CreateIndex
CREATE INDEX "Entity_entityType_idx" ON "Entity"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_sourceUrl_key" ON "Contribution"("sourceUrl");

-- CreateIndex
CREATE INDEX "Contribution_contributionType_idx" ON "Contribution"("contributionType");

-- CreateIndex
CREATE INDEX "Contribution_verificationStatus_idx" ON "Contribution"("verificationStatus");

-- CreateIndex
CREATE INDEX "PerspectiveAnnotation_perspectiveTheme_idx" ON "PerspectiveAnnotation"("perspectiveTheme");

-- CreateIndex
CREATE UNIQUE INDEX "PerspectiveAnnotation_sourceId_perspectiveTheme_targetEntit_key" ON "PerspectiveAnnotation"("sourceId", "perspectiveTheme", "targetEntity", "evidenceExcerpt");

-- CreateIndex
CREATE INDEX "Triplet_relation_idx" ON "Triplet"("relation");

-- CreateIndex
CREATE UNIQUE INDEX "Triplet_subject_relation_object_sourceId_key" ON "Triplet"("subject", "relation", "object", "sourceId");

-- CreateIndex
CREATE INDEX "SubmittedData_status_idx" ON "SubmittedData"("status");

-- CreateIndex
CREATE INDEX "SubmittedData_submissionType_idx" ON "SubmittedData"("submissionType");

-- CreateIndex
CREATE INDEX "PipelineRun_pipelineName_idx" ON "PipelineRun"("pipelineName");

-- CreateIndex
CREATE INDEX "PipelineRun_status_idx" ON "PipelineRun"("status");

-- CreateIndex
CREATE INDEX "SourcePullJob_adapter_idx" ON "SourcePullJob"("adapter");

-- CreateIndex
CREATE INDEX "SourcePullJob_status_idx" ON "SourcePullJob"("status");

-- CreateIndex
CREATE INDEX "OwnedInventory_robotModelId_idx" ON "OwnedInventory"("robotModelId");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_relatedRobotModelId_fkey" FOREIGN KEY ("relatedRobotModelId") REFERENCES "RobotModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerspectiveAnnotation" ADD CONSTRAINT "PerspectiveAnnotation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triplet" ADD CONSTRAINT "Triplet_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedData" ADD CONSTRAINT "SubmittedData_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedInventory" ADD CONSTRAINT "OwnedInventory_robotModelId_fkey" FOREIGN KEY ("robotModelId") REFERENCES "RobotModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
