import { getCurrentDataProvider } from "@/lib/data-providers";
import type {
  DataProvider,
  ProviderDailyQuote,
  ProviderMarketSnapshot,
  ProviderStock,
  ProviderStockScore,
  RefreshTaskType,
} from "@/lib/data-providers/types";
import { getDatabaseFallbackWarning, prisma } from "@/lib/prisma";

const validTasks: RefreshTaskType[] = ["market", "sectors", "stocks", "report", "all"];
const subTasks: Exclude<RefreshTaskType, "all" | "report">[] = ["market", "sectors", "stocks"];

function isRefreshTaskType(value: unknown): value is RefreshTaskType {
  return typeof value === "string" && validTasks.includes(value as RefreshTaskType);
}

function formatDateTime(date: Date | null) {
  return date ? date.toISOString() : null;
}

function getDurationMs(startedAt: Date, finishedAt: Date | null) {
  if (!finishedAt) {
    return null;
  }

  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}

function formatPercentValue(value: string) {
  return Number(value.replace("%", ""));
}

function formatAmountYi(value: string) {
  return Number(value.replace(/,/g, "").replace(/[^\d.-]/g, "")) * 100_000_000;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

type RefreshLogShape = {
  id: number;
  provider: string;
  taskType: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  message: string;
  errorMessage: string | null;
  createdAt: Date;
};

async function createRefreshLog(provider: string, taskType: string, message: string) {
  if (!prisma) {
    const now = new Date();

    return {
      id: now.getTime(),
      provider,
      taskType,
      status: "running",
      startedAt: now,
      finishedAt: null,
      message,
      errorMessage: null,
      createdAt: now,
    } satisfies RefreshLogShape;
  }

  return await prisma.dataRefreshLog.create({
    data: {
      provider,
      taskType,
      status: "running",
      startedAt: new Date(),
      message,
    },
  });
}

async function completeRefreshLog(
  logId: number,
  status: "success" | "failed" | "partial",
  message: string,
  errorMessage: string | null = null,
) {
  if (!prisma) {
    const now = new Date();

    return {
      id: logId,
      provider: "mock",
      taskType: "all",
      status,
      startedAt: new Date(now.getTime() - 50),
      finishedAt: now,
      message,
      errorMessage,
      createdAt: now,
    } satisfies RefreshLogShape;
  }

  return await prisma.dataRefreshLog.update({
    where: { id: logId },
    data: {
      status,
      finishedAt: new Date(),
      message,
      errorMessage,
    },
  });
}

async function syncStocks(stocks: ProviderStock[]) {
  if (!prisma) {
    return 0;
  }

  for (const stock of stocks) {
    await prisma.stock.upsert({
      where: { code: stock.code },
      create: stock,
      update: {
        name: stock.name,
        market: stock.market,
        sector: stock.sector,
        industry: stock.industry,
        isST: stock.isST,
      },
    });
  }

  return stocks.length;
}

async function syncQuotes(quotes: ProviderDailyQuote[]) {
  if (!prisma) {
    return 0;
  }

  for (const quote of quotes) {
    await prisma.dailyQuote.upsert({
      where: {
        stockCode_tradeDate: {
          stockCode: quote.stockCode,
          tradeDate: quote.tradeDate,
        },
      },
      create: quote,
      update: {
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume,
        amount: quote.amount,
        pctChange: quote.pctChange,
        turnoverRate: quote.turnoverRate,
      },
    });
  }

  return quotes.length;
}

async function syncIndexSnapshot(snapshot: ProviderMarketSnapshot) {
  const indexStocks = snapshot.indices.map((index) => ({
    code: index.code,
    name: index.name,
    market: index.market,
    sector: "宽基指数",
    industry: "指数",
    isST: false,
  }));
  const indexQuotes = snapshot.indices.map((index) => ({
    stockCode: index.code,
    tradeDate: index.tradeDate,
    open: index.open,
    high: index.high,
    low: index.low,
    close: index.close,
    volume: index.volume,
    amount: index.amount,
    pctChange: index.pctChange,
    turnoverRate: 0,
  }));

  await syncStocks(indexStocks);
  await syncQuotes(indexQuotes);

  return snapshot.indices.length;
}

async function syncMarket(provider: DataProvider) {
  const marketSnapshot = provider.getMarketSnapshot
    ? await provider.getMarketSnapshot()
    : null;
  let stockCount = 0;
  let quoteCount = 0;
  let stockError: string | null = null;

  try {
    const stocks = await provider.getStockList();
    stockCount = await syncStocks(stocks);
    const quotes = (
      await Promise.all(stocks.map((stock) => provider.getStockDailyQuotes(stock.code)))
    ).flat();
    quoteCount = await syncQuotes(quotes);
  } catch (error) {
    stockError =
      error instanceof Error ? error.message : "市场股票快照刷新失败";
  }

  const indexCount = marketSnapshot ? await syncIndexSnapshot(marketSnapshot) : 0;

  if (!marketSnapshot) {
    if (stockError) {
      throw new Error(stockError);
    }

    await provider.getMarketOverview();
    await provider.getIndexQuotes();
  }

  if (stockError && indexCount === 0) {
    throw new Error(stockError);
  }

  const messageParts = [
    `market 刷新完成：${stockCount} 只股票`,
    `${quoteCount} 条个股日行情`,
  ];

  if (indexCount > 0) {
    messageParts.push(`${indexCount} 条指数行情`);
  }

  if (marketSnapshot?.partial) {
    messageParts.push("AkShare 市场数据为部分字段降级结果");
  }

  if (stockError) {
    messageParts.push(`股票快照未刷新：${stockError}`);
  }

  return messageParts.join("，");
}

async function syncSectors(provider: DataProvider) {
  if (!prisma) {
    return "sectors 模拟刷新完成：生产环境未连接数据库";
  }

  const sectors = await provider.getSectorRankings();
  const tradeDate = startOfToday();

  for (const sector of sectors) {
    await prisma.sectorDailyStat.upsert({
      where: {
        sectorName_tradeDate: {
          sectorName: sector.name,
          tradeDate,
        },
      },
      create: {
        sectorName: sector.name,
        tradeDate,
        pctChange: formatPercentValue(sector.changePercent),
        amount: formatAmountYi(sector.turnover),
        limitUpCount: sector.limitUp,
        hotScore: sector.heat,
        leadingStock: sector.leader,
        riskLevel: sector.riskLevel,
        focusLevel: sector.focus,
      },
      update: {
        pctChange: formatPercentValue(sector.changePercent),
        amount: formatAmountYi(sector.turnover),
        limitUpCount: sector.limitUp,
        hotScore: sector.heat,
        leadingStock: sector.leader,
        riskLevel: sector.riskLevel,
        focusLevel: sector.focus,
      },
    });
  }

  return `sectors 刷新完成：${sectors.length} 个板块`;
}

async function syncScores(scores: ProviderStockScore[]) {
  if (!prisma) {
    return 0;
  }

  for (const score of scores) {
    await prisma.stockScore.upsert({
      where: {
        stockCode_tradeDate: {
          stockCode: score.stockCode,
          tradeDate: score.tradeDate,
        },
      },
      create: score,
      update: {
        trendScore: score.trendScore,
        volumeScore: score.volumeScore,
        sectorScore: score.sectorScore,
        fundScore: score.fundScore,
        riskScore: score.riskScore,
        totalScore: score.totalScore,
        rating: score.rating,
        buyTrigger: score.buyTrigger,
        stopLoss: score.stopLoss,
        takeProfit: score.takeProfit,
        riskNote: score.riskNote,
        reason: score.reason,
      },
    });
  }

  return scores.length;
}

async function syncStockScores(provider: DataProvider) {
  const stocks = await provider.getStockList();
  const stockCount = await syncStocks(stocks);
  const quotes = (
    await Promise.all(stocks.map((stock) => provider.getStockDailyQuotes(stock.code)))
  ).flat();
  const quoteCount = await syncQuotes(quotes);
  const scores = await provider.getStockScores();
  const scoreCount = await syncScores(scores);

  return `stocks 刷新完成：${stockCount} 只股票，${quoteCount} 条日行情，${scoreCount} 条评分`;
}

async function syncReport(provider: DataProvider) {
  if (!prisma) {
    return `report 模拟刷新完成：${provider.name} / 未连接数据库`;
  }

  const report = await provider.getLatestReport();

  await prisma.dailyReport.upsert({
    where: {
      reportDate: new Date(`${report.date}T00:00:00.000Z`),
    },
    create: {
      reportDate: new Date(`${report.date}T00:00:00.000Z`),
      marketSummary: report.conclusion,
      indexPerformance: JSON.stringify(report.indexPerformance),
      hotSectors: JSON.stringify(report.sectorOrder),
      watchlist: JSON.stringify(report.watchTargets),
      previousReview: JSON.stringify(report.previousReview),
      avoidDirections: JSON.stringify(report.avoidDirections),
      riskWarning:
        "本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。股市有风险，交易需谨慎。所有买卖决策由用户自行承担。",
    },
    update: {
      marketSummary: report.conclusion,
      indexPerformance: JSON.stringify(report.indexPerformance),
      hotSectors: JSON.stringify(report.sectorOrder),
      watchlist: JSON.stringify(report.watchTargets),
      previousReview: JSON.stringify(report.previousReview),
      avoidDirections: JSON.stringify(report.avoidDirections),
    },
  });

  return `report 刷新完成：${report.date}`;
}

async function runSingleTask(provider: DataProvider, taskType: Exclude<RefreshTaskType, "all">) {
  if (taskType === "market") {
    return await syncMarket(provider);
  }

  if (taskType === "sectors") {
    return await syncSectors(provider);
  }

  if (taskType === "stocks") {
    return await syncStockScores(provider);
  }

  return await syncReport(provider);
}

async function refreshSingleTask(
  provider: DataProvider,
  taskType: Exclude<RefreshTaskType, "all">,
) {
  const log = await createRefreshLog(provider.name, taskType, `开始刷新 ${taskType}`);

  try {
    const message = await runSingleTask(provider, taskType);
    const updatedLog = await completeRefreshLog(log.id, "success", message);

    return {
      ok: true,
      taskType,
      status: "success" as const,
      message,
      log: serializeRefreshLog(updatedLog),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : `${taskType} 刷新失败，未知错误`;
    const updatedLog = await completeRefreshLog(
      log.id,
      "failed",
      `${taskType} 刷新失败`,
      errorMessage,
    );

    return {
      ok: false,
      taskType,
      status: "failed" as const,
      message: `${taskType} 刷新失败`,
      errorMessage,
      log: serializeRefreshLog(updatedLog),
    };
  }
}

function buildSimulatedRefreshResult(
  provider: DataProvider,
  taskType: RefreshTaskType,
  warning: string,
) {
  const generatedAt = new Date().toISOString();

  if (taskType === "all") {
    return {
      ok: true,
      provider: provider.name,
      taskType,
      status: "success",
      message: "all 模拟刷新完成：生产环境未连接数据库，保留 mock fallback",
      warning,
      dataSource: "mock-fallback" as const,
      generatedAt,
      tasks: subTasks.map((subTask) => ({
        ok: true,
        taskType: subTask,
        status: "success" as const,
        message: `${subTask} 模拟刷新完成`,
      })),
      log: null,
    };
  }

  return {
    ok: true,
    provider: provider.name,
    taskType,
    status: "success",
    message: `${taskType} 模拟刷新完成：未连接数据库，保留 mock fallback`,
    warning,
    dataSource: "mock-fallback" as const,
    generatedAt,
    log: null,
  };
}

export async function refreshData(inputTaskType: unknown) {
  const taskType = isRefreshTaskType(inputTaskType) ? inputTaskType : "all";
  const provider = getCurrentDataProvider();
  const status = await provider.getStatus();
  const databaseWarning = getDatabaseFallbackWarning();

  if (!prisma) {
    if (provider.name === "mock") {
      return buildSimulatedRefreshResult(provider, taskType, databaseWarning);
    }

    return {
      ok: false,
      provider: provider.name,
      taskType,
      status: "failed",
      message: `${taskType} 刷新失败`,
      errorMessage: databaseWarning,
      warning: databaseWarning,
      dataSource: "mock-fallback" as const,
      generatedAt: new Date().toISOString(),
      tasks: [],
      log: null,
    };
  }

  if (taskType !== "all") {
    if (!status.available) {
      const log = await createRefreshLog(provider.name, taskType, `开始刷新 ${taskType}`);
      const updatedLog = await completeRefreshLog(
        log.id,
        "failed",
        `${taskType} 刷新失败`,
        status.message,
      );

      return {
        ok: false,
        provider: provider.name,
        taskType,
        status: "failed",
        message: `${taskType} 刷新失败`,
        errorMessage: status.message,
        log: serializeRefreshLog(updatedLog),
      };
    }

    const result = await refreshSingleTask(provider, taskType);

    return {
      ...result,
      provider: provider.name,
    };
  }

  const aggregateLog = await createRefreshLog(provider.name, "all", "开始刷新 all");

  if (!status.available) {
    const updatedLog = await completeRefreshLog(
      aggregateLog.id,
      "failed",
      "all 刷新失败",
      status.message,
    );

    return {
      ok: false,
      provider: provider.name,
      taskType: "all",
      status: "failed",
      message: "all 刷新失败",
      errorMessage: status.message,
      tasks: [],
      log: serializeRefreshLog(updatedLog),
    };
  }

  const taskResults = [];
  let successCount = 0;
  let failedCount = 0;

  for (const subTask of subTasks) {
    const result = await refreshSingleTask(provider, subTask);
    taskResults.push(result);

    if (result.ok) {
      successCount += 1;
    } else {
      failedCount += 1;
    }
  }

  const aggregateStatus =
    failedCount === 0 ? "success" : successCount === 0 ? "failed" : "partial";
  const message = taskResults
    .map((result) =>
      result.ok ? result.message : `${result.taskType} 失败：${result.errorMessage}`,
    )
    .join("；");
  const updatedLog = await completeRefreshLog(
    aggregateLog.id,
    aggregateStatus,
    message,
    failedCount > 0 ? `${failedCount} 个任务失败` : null,
  );

  return {
    ok: failedCount === 0,
    provider: provider.name,
    taskType: "all",
    status: aggregateStatus,
    message,
    errorMessage: failedCount > 0 ? `${failedCount} 个任务失败` : undefined,
    tasks: taskResults,
    log: serializeRefreshLog(updatedLog),
  };
}

export function serializeRefreshLog(log: {
  id: number;
  provider: string;
  taskType: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  message: string;
  errorMessage: string | null;
  createdAt: Date;
}) {
  return {
    id: log.id,
    provider: log.provider,
    taskType: log.taskType,
    status: log.status,
    startedAt: formatDateTime(log.startedAt),
    finishedAt: formatDateTime(log.finishedAt),
    durationMs: getDurationMs(log.startedAt, log.finishedAt),
    message: log.message,
    errorMessage: log.errorMessage,
    createdAt: formatDateTime(log.createdAt),
  };
}

export async function getRefreshLogs(limit = 20) {
  if (!prisma) {
    return [];
  }

  const logs = await prisma.dataRefreshLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map(serializeRefreshLog);
}

export async function getLatestRefreshLog(
  provider: string,
  taskTypes: string[],
) {
  if (!prisma) {
    return null;
  }

  const latestLog = await prisma.dataRefreshLog.findFirst({
    where: {
      provider,
      taskType: {
        in: taskTypes,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return latestLog ? serializeRefreshLog(latestLog) : null;
}

export async function getDataProviderStatus() {
  const provider = getCurrentDataProvider();
  const status = await provider.getStatus();
  if (!prisma) {
    return {
      ...status,
      latestRefresh: null,
    };
  }

  const latestLog = await prisma.dataRefreshLog.findFirst({
    where: { provider: provider.name },
    orderBy: { createdAt: "desc" },
  });

  return {
    ...status,
    latestRefresh: latestLog ? serializeRefreshLog(latestLog) : null,
  };
}
