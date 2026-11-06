ALTER TYPE "SourceType" ADD VALUE IF NOT EXISTS 'THAIJO';

CREATE TABLE "HriAnalysis" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "workplaceName" TEXT,
    "robotName" TEXT,
    "careSetting" TEXT,
    "interactionOutcome" TEXT NOT NULL DEFAULT 'unclear',
    "communicationBarrier" TEXT NOT NULL DEFAULT 'unclear',
    "barrierStatus" TEXT NOT NULL DEFAULT 'unclear',
    "positiveEmotions" JSONB NOT NULL DEFAULT '[]',
    "negativeEmotions" JSONB NOT NULL DEFAULT '[]',
    "humanResponse" TEXT NOT NULL DEFAULT 'unclear',
    "robotResponse" TEXT NOT NULL DEFAULT 'unclear',
    "positiveInteractionCount" INTEGER,
    "negativeInteractionCount" INTEGER,
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "evidenceExcerpt" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analysisStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "analysisMethod" TEXT NOT NULL DEFAULT 'pending',
    "analysisError" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HriAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HriAnalysis_sourceId_key" ON "HriAnalysis"("sourceId");
CREATE INDEX "HriAnalysis_workplaceName_idx" ON "HriAnalysis"("workplaceName");
CREATE INDEX "HriAnalysis_robotName_idx" ON "HriAnalysis"("robotName");
CREATE INDEX "HriAnalysis_interactionOutcome_idx" ON "HriAnalysis"("interactionOutcome");
CREATE INDEX "HriAnalysis_analysisStatus_idx" ON "HriAnalysis"("analysisStatus");

ALTER TABLE "HriAnalysis"
ADD CONSTRAINT "HriAnalysis_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "SourceRecord"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
