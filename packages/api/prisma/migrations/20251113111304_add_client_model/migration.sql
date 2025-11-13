-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "websiteUrl" VARCHAR(2048) NOT NULL,
    "clientId" VARCHAR(255),
    "scanResults" TEXT NOT NULL,
    "aiConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidenceDetails" JSONB NOT NULL DEFAULT '{}',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" VARCHAR(255),
    "reviewedAt" TIMESTAMP(3),
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "reportPdf" VARCHAR(2048),
    "reportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "wcagCriteria" VARCHAR(10) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
    "elementSelector" VARCHAR(2048),
    "screenshot" VARCHAR(2048),
    "codeSnippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "consultantEmail" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "wcagCertified" BOOLEAN NOT NULL DEFAULT false,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "specialization" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalAuditsReviewed" INTEGER NOT NULL DEFAULT 0,
    "accuracyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'basic',
    "scansRemaining" INTEGER NOT NULL DEFAULT 10,
    "subscriptionId" VARCHAR(255),
    "stripeCustomerId" VARCHAR(255),
    "status" TEXT NOT NULL DEFAULT 'active',
    "apiKey" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "adariskLevel" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "typicalRevenueMin" INTEGER NOT NULL DEFAULT 1000000,
    "typicalRevenueMax" INTEGER NOT NULL DEFAULT 10000000,
    "typicalEmployeeMin" INTEGER NOT NULL DEFAULT 5,
    "typicalEmployeeMax" INTEGER NOT NULL DEFAULT 100,
    "techOrientationScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "techAdoptionSpeed" VARCHAR(50) NOT NULL DEFAULT 'slow',
    "isBlueCollar" BOOLEAN NOT NULL DEFAULT true,
    "location" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetBusiness" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "website" VARCHAR(2048),
    "industryId" TEXT NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "revenue" INTEGER,
    "employeeCount" INTEGER,
    "ownerName" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "wcagScore" DOUBLE PRECISION,
    "wcagViolationCount" INTEGER NOT NULL DEFAULT 0,
    "lastScanned" TIMESTAMP(3),
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "outreachStatus" VARCHAR(50) NOT NULL DEFAULT 'not_contacted',
    "outreachAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastOutreachDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetBusinessViolation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "wcagCriteria" VARCHAR(10) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetBusinessViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scan_approvalStatus_idx" ON "Scan"("approvalStatus");

-- CreateIndex
CREATE INDEX "Scan_aiConfidenceScore_idx" ON "Scan"("aiConfidenceScore");

-- CreateIndex
CREATE INDEX "Scan_createdAt_idx" ON "Scan"("createdAt");

-- CreateIndex
CREATE INDEX "Scan_clientId_idx" ON "Scan"("clientId");

-- CreateIndex
CREATE INDEX "Violation_scanId_idx" ON "Violation"("scanId");

-- CreateIndex
CREATE INDEX "Violation_wcagCriteria_idx" ON "Violation"("wcagCriteria");

-- CreateIndex
CREATE INDEX "Violation_aiConfidence_idx" ON "Violation"("aiConfidence");

-- CreateIndex
CREATE INDEX "ReviewLog_scanId_idx" ON "ReviewLog"("scanId");

-- CreateIndex
CREATE INDEX "ReviewLog_timestamp_idx" ON "ReviewLog"("timestamp");

-- CreateIndex
CREATE INDEX "ReviewLog_action_idx" ON "ReviewLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_email_key" ON "Consultant"("email");

-- CreateIndex
CREATE INDEX "Consultant_email_idx" ON "Consultant"("email");

-- CreateIndex
CREATE INDEX "Consultant_isActive_idx" ON "Consultant"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_apiKey_key" ON "Client"("apiKey");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_stripeCustomerId_idx" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Client_apiKey_idx" ON "Client"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_name_key" ON "Industry"("name");

-- CreateIndex
CREATE INDEX "Industry_adariskLevel_idx" ON "Industry"("adariskLevel");

-- CreateIndex
CREATE INDEX "Industry_techOrientationScore_idx" ON "Industry"("techOrientationScore");

-- CreateIndex
CREATE INDEX "Industry_techAdoptionSpeed_idx" ON "Industry"("techAdoptionSpeed");

-- CreateIndex
CREATE INDEX "Industry_name_idx" ON "Industry"("name");

-- CreateIndex
CREATE INDEX "TargetBusiness_industryId_idx" ON "TargetBusiness"("industryId");

-- CreateIndex
CREATE INDEX "TargetBusiness_city_idx" ON "TargetBusiness"("city");

-- CreateIndex
CREATE INDEX "TargetBusiness_wcagScore_idx" ON "TargetBusiness"("wcagScore");

-- CreateIndex
CREATE INDEX "TargetBusiness_matchScore_idx" ON "TargetBusiness"("matchScore");

-- CreateIndex
CREATE INDEX "TargetBusiness_outreachStatus_idx" ON "TargetBusiness"("outreachStatus");

-- CreateIndex
CREATE INDEX "TargetBusiness_createdAt_idx" ON "TargetBusiness"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TargetBusiness_website_key" ON "TargetBusiness"("website");

-- CreateIndex
CREATE INDEX "TargetBusinessViolation_businessId_idx" ON "TargetBusinessViolation"("businessId");

-- CreateIndex
CREATE INDEX "TargetBusinessViolation_wcagCriteria_idx" ON "TargetBusinessViolation"("wcagCriteria");

-- CreateIndex
CREATE INDEX "TargetBusinessViolation_severity_idx" ON "TargetBusinessViolation"("severity");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetBusiness" ADD CONSTRAINT "TargetBusiness_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetBusinessViolation" ADD CONSTRAINT "TargetBusinessViolation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "TargetBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
