CREATE TABLE "CashSession" (
"id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id"), "registerName" TEXT NOT NULL,
"openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedAt" TIMESTAMP(3),
"openingCash" DECIMAL(12,2) NOT NULL, "cashSales" DECIMAL(12,2), "cardSales" DECIMAL(12,2),
"transferSales" DECIMAL(12,2), "expectedCash" DECIMAL(12,2), "countedCash" DECIMAL(12,2), "difference" DECIMAL(12,2), "notes" TEXT);
CREATE UNIQUE INDEX "CashSession_one_open_user" ON "CashSession"("userId") WHERE "closedAt" IS NULL;
CREATE UNIQUE INDEX "CashSession_one_open_register" ON "CashSession"("registerName") WHERE "closedAt" IS NULL;
CREATE INDEX "CashSession_openedAt_idx" ON "CashSession"("openedAt");
ALTER TABLE "Sale" ADD COLUMN "cashSessionId" TEXT REFERENCES "CashSession"("id");
CREATE INDEX "Sale_cashSessionId_idx" ON "Sale"("cashSessionId");
