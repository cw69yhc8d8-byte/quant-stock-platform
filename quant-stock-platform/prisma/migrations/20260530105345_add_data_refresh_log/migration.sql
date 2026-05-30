-- CreateTable
CREATE TABLE "DataRefreshLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "message" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DataRefreshLog_provider_idx" ON "DataRefreshLog"("provider");

-- CreateIndex
CREATE INDEX "DataRefreshLog_taskType_idx" ON "DataRefreshLog"("taskType");

-- CreateIndex
CREATE INDEX "DataRefreshLog_status_idx" ON "DataRefreshLog"("status");

-- CreateIndex
CREATE INDEX "DataRefreshLog_startedAt_idx" ON "DataRefreshLog"("startedAt");
