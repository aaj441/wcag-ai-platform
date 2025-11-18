-- Add composite indexes for performance optimization (<5s query requirement)

-- Prospect table composite indexes
CREATE INDEX "Prospect_metroId_priority_riskScore_idx" ON "Prospect"("metroId", "priority", "riskScore");
CREATE INDEX "Prospect_metroId_industryId_riskScore_idx" ON "Prospect"("metroId", "industryId", "riskScore");
CREATE INDEX "Prospect_metroId_complianceScore_idx" ON "Prospect"("metroId", "complianceScore");

-- Metro table composite index
CREATE INDEX "Metro_state_adaLawsuitTrend_idx" ON "Metro"("state", "adaLawsuitTrend");
