-- CreateTable
CREATE TABLE "Stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "isST" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyQuote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stockCode" TEXT NOT NULL,
    "tradeDate" DATETIME NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "pctChange" REAL NOT NULL,
    "turnoverRate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyQuote_stockCode_fkey" FOREIGN KEY ("stockCode") REFERENCES "Stock" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SectorDailyStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sectorName" TEXT NOT NULL,
    "tradeDate" DATETIME NOT NULL,
    "pctChange" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "limitUpCount" INTEGER NOT NULL,
    "hotScore" INTEGER NOT NULL,
    "leadingStock" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "focusLevel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StockScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stockCode" TEXT NOT NULL,
    "tradeDate" DATETIME NOT NULL,
    "trendScore" INTEGER NOT NULL,
    "volumeScore" INTEGER NOT NULL,
    "sectorScore" INTEGER NOT NULL,
    "fundScore" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "buyTrigger" TEXT NOT NULL,
    "stopLoss" TEXT NOT NULL,
    "takeProfit" TEXT NOT NULL,
    "riskNote" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockScore_stockCode_fkey" FOREIGN KEY ("stockCode") REFERENCES "Stock" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportDate" DATETIME NOT NULL,
    "marketSummary" TEXT NOT NULL,
    "indexPerformance" TEXT NOT NULL,
    "hotSectors" TEXT NOT NULL,
    "watchlist" TEXT NOT NULL,
    "previousReview" TEXT NOT NULL,
    "avoidDirections" TEXT NOT NULL,
    "riskWarning" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TradeJournal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stockCode" TEXT NOT NULL,
    "stockName" TEXT NOT NULL,
    "buyDate" DATETIME NOT NULL,
    "buyPrice" REAL NOT NULL,
    "sellDate" DATETIME,
    "sellPrice" REAL,
    "positionSize" REAL NOT NULL,
    "stopLoss" TEXT NOT NULL,
    "takeProfit" TEXT NOT NULL,
    "buyReason" TEXT NOT NULL,
    "sellReason" TEXT,
    "profitLoss" REAL,
    "profitLossPct" REAL,
    "reviewNote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_code_key" ON "Stock"("code");

-- CreateIndex
CREATE INDEX "Stock_sector_idx" ON "Stock"("sector");

-- CreateIndex
CREATE INDEX "Stock_industry_idx" ON "Stock"("industry");

-- CreateIndex
CREATE INDEX "DailyQuote_tradeDate_idx" ON "DailyQuote"("tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuote_stockCode_tradeDate_key" ON "DailyQuote"("stockCode", "tradeDate");

-- CreateIndex
CREATE INDEX "SectorDailyStat_tradeDate_idx" ON "SectorDailyStat"("tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "SectorDailyStat_sectorName_tradeDate_key" ON "SectorDailyStat"("sectorName", "tradeDate");

-- CreateIndex
CREATE INDEX "StockScore_tradeDate_idx" ON "StockScore"("tradeDate");

-- CreateIndex
CREATE INDEX "StockScore_rating_idx" ON "StockScore"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "StockScore_stockCode_tradeDate_key" ON "StockScore"("stockCode", "tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_reportDate_key" ON "DailyReport"("reportDate");

-- CreateIndex
CREATE INDEX "TradeJournal_stockCode_idx" ON "TradeJournal"("stockCode");

-- CreateIndex
CREATE INDEX "TradeJournal_buyDate_idx" ON "TradeJournal"("buyDate");
