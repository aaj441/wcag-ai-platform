-- CreateTable Fix
CREATE TABLE IF NOT EXISTS "Fix" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "wcagCriteria" VARCHAR(10) NOT NULL,
    "issueType" VARCHAR(100) NOT NULL,
    "codeLanguage" TEXT NOT NULL DEFAULT 'html',
    "originalCode" TEXT,
    "fixedCode" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "githubBranchName" TEXT,
    "githubPRUrl" TEXT,
    "githubCommitSha" TEXT,
    "generatedBy" TEXT NOT NULL DEFAULT 'gpt-4',
    "generationCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Fix_violationId_key" UNIQUE ("violationId"),
    CONSTRAINT "Fix_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation" ("id") ON DELETE CASCADE
);

-- CreateTable FixApplication
CREATE TABLE IF NOT EXISTS "FixApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "fixId" TEXT NOT NULL,
    "appliedBy" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repository" TEXT,
    "filePath" TEXT,
    "branch" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixApplication_fixId_fkey" FOREIGN KEY ("fixId") REFERENCES "Fix" ("id") ON DELETE CASCADE
);

-- CreateTable FixTemplate
CREATE TABLE IF NOT EXISTS "FixTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wcagCriteria" VARCHAR(10) NOT NULL,
    "issueType" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "codeLanguages" TEXT[],
    "templates" JSONB NOT NULL,
    "examples" JSONB NOT NULL,
    "testCases" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fix_tenantId_reviewStatus_idx" ON "Fix"("tenantId", "reviewStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fix_wcagCriteria_idx" ON "Fix"("wcagCriteria");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fix_confidenceScore_idx" ON "Fix"("confidenceScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FixApplication_tenantId_appliedAt_idx" ON "FixApplication"("tenantId", "appliedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FixApplication_fixId_idx" ON "FixApplication"("fixId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FixTemplate_wcagCriteria_idx" ON "FixTemplate"("wcagCriteria");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FixTemplate_isActive_idx" ON "FixTemplate"("isActive");
