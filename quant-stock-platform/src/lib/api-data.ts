import { createApiEnvelope } from "@/lib/api-response";
import { getConfiguredProviderName } from "@/lib/data-providers";
import { getLatestRefreshLog } from "@/lib/data-refresh";
import { getDatabaseFallbackWarning, prisma } from "@/lib/prisma";
import { dedupeSectorRankings } from "@/lib/sector-utils";
import {
  dailyReport as mockDailyReport,
  indexData,
  intradayMarketFlow,
  marketMovers as mockMarketMovers,
  marketOverview as mockMarketOverview,
  sectorRankings,
  stockWatchlist,
  tradeJournal as mockTradeJournal,
} from "@/lib/mock-data";
import type {
  DailyReport,
  DailyReportStock,
  IndexDatum,
  MarketMover,
  MarketOverview,
  SectorRanking,
  StockWatchItem,
  TradeJournal,
} from "@/lib/types";

type DataSource = "database" | "mock-fallback";

export type MarketOverviewData = {
  indexData: IndexDatum[];
  marketOverview: MarketOverview;
  marketMovers: {
    gainers: MarketMover[];
    losers: MarketMover[];
    turnoverLeaders: MarketMover[];
  };
  intradayMarketFlow: typeof intradayMarketFlow;
};

export type SectorOverviewData = {
  sectorRankings: SectorRanking[];
};

export type StocksOverviewData = {
  stockWatchlist: StockWatchItem[];
};

export type StockDetailData = {
  stock: {
    code: string;
    name: string;
    market: string;
    sector: string;
    industry: string;
    isST: boolean;
  } | null;
  quotes: Array<{
    tradeDate: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
    pctChange: number;
    turnoverRate: number;
  }>;
  score:
    | {
        tradeDate?: string;
        trendScore?: number;
        volumeScore?: number;
        sectorScore?: number;
        fundScore?: number;
        riskScore?: number;
        totalScore?: number;
        rating: string;
        buyTrigger: string;
        stopLoss: string;
        takeProfit: string;
        riskNote?: string;
        risk?: string;
        reason?: string;
      }
    | StockWatchItem
    | null;
};

export type LatestReportData = {
  dailyReport: DailyReport;
  riskWarning: string;
};

export type JournalData = {
  tradeJournal: TradeJournal;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value >= 1000 ? 2 : 2,
  });
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatYi(value: number) {
  return `${Math.round(value / 100_000_000).toLocaleString("en-US")} 亿`;
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function latestDate(dates: Array<Date | null | undefined>) {
  const timestamps = dates
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime());

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
}

async function buildApiResponse<T>({
  taskTypes,
  source,
  data,
  fallbackReason = null,
  error = null,
  warning = null,
  updatedAt = null,
  partial = false,
}: {
  taskTypes: string[];
  source: DataSource;
  data: T;
  fallbackReason?: string | null;
  error?: string | null;
  warning?: string | null;
  updatedAt?: Date | null;
  partial?: boolean;
}) {
  const provider = getConfiguredProviderName();
  const latestRefresh = await getLatestRefreshLog(provider, taskTypes);

  return createApiEnvelope({
    success: true,
    provider,
    source,
    refreshedAt: latestRefresh?.finishedAt ?? latestRefresh?.createdAt ?? null,
    updatedAt: updatedAt?.toISOString() ?? null,
    data,
    error,
    fallbackReason,
    warning,
    partial,
    meta: {
      latestRefreshStatus: latestRefresh?.status ?? null,
      latestRefreshTaskType: latestRefresh?.taskType ?? null,
      latestRefreshDurationMs: latestRefresh?.durationMs ?? null,
    },
  });
}

function toMarketMover(row: {
  stockCode: string;
  close: number;
  pctChange: number;
  amount: number;
  stock: { name: string; sector: string };
}): MarketMover {
  return {
    code: row.stockCode,
    name: row.stock.name,
    sector: row.stock.sector,
    price: formatPrice(row.close),
    changePercent: formatPercent(row.pctChange),
    turnover: formatYi(row.amount),
    reason: row.pctChange >= 0 ? "SQLite 最新行情涨幅居前" : "SQLite 最新行情跌幅居前",
  };
}

function buildIndexSeries(close: number, previousClose: number, high: number, low: number, open: number) {
  const seriesValues = [
    open || previousClose,
    (open + close) / 2,
    high || Math.max(open, close),
    (high + close) / 2,
    (open + close) / 2,
    low || Math.min(open, close),
    (low + close) / 2,
    (close + high) / 2,
    close,
  ];

  return ["09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00"].map(
    (time, index) => ({
      time,
      value: Number(seriesValues[index].toFixed(2)),
    }),
  );
}

function buildIndexCards(rows: Array<{
  stockCode: string;
  close: number;
  pctChange: number;
  amount: number;
  open: number;
  high: number;
  low: number;
}>): IndexDatum[] {
  const labels: Record<string, string> = {
    "000001.SH": "上证指数",
    "399001.SZ": "深证成指",
    "399006.SZ": "创业板指",
  };

  return rows
    .filter((row) => labels[row.stockCode])
    .map((row) => {
      const previousClose =
        row.pctChange === -100
          ? row.close
          : row.close / Math.max(0.0001, 1 + row.pctChange / 100);
      const changePoints = row.close - previousClose;

      return {
        name: labels[row.stockCode],
        code: row.stockCode,
        value: formatPrice(row.close),
        changePercent: formatPercent(row.pctChange),
        changePoints: `${changePoints > 0 ? "+" : ""}${changePoints.toFixed(2)}`,
        trend: row.pctChange >= 0 ? "up" : "down",
        series: buildIndexSeries(
          row.close,
          previousClose,
          row.high,
          row.low,
          row.open,
        ),
      } satisfies IndexDatum;
    })
    .sort((left, right) =>
      ["000001.SH", "399001.SZ", "399006.SZ"].indexOf(left.code) -
      ["000001.SH", "399001.SZ", "399006.SZ"].indexOf(right.code),
    );
}

async function mockMarketEnvelope(reason: string) {
  return await buildApiResponse<MarketOverviewData>({
    taskTypes: ["market", "all"],
    source: "mock-fallback",
    fallbackReason: reason,
    error: reason,
    warning: reason,
    data: {
      indexData,
      marketOverview: mockMarketOverview,
      marketMovers: mockMarketMovers,
      intradayMarketFlow,
    },
  });
}

export async function getMarketOverview() {
  if (!prisma) {
    return await mockMarketEnvelope(getDatabaseFallbackWarning());
  }

  try {
    const quotes = await prisma.dailyQuote.findMany({
      include: { stock: true },
      orderBy: { amount: "desc" },
    });

    const stockQuotes = quotes.filter((quote) => quote.stock.market !== "INDEX");
    const indexQuotes = buildIndexCards(
      quotes
        .filter((quote) => quote.stock.market === "INDEX")
        .map((quote) => ({
          stockCode: quote.stockCode,
          close: quote.close,
          pctChange: quote.pctChange,
          amount: quote.amount,
          open: quote.open,
          high: quote.high,
          low: quote.low,
        })),
    );

    if (stockQuotes.length === 0) {
      return await mockMarketEnvelope("数据库暂无日行情数据");
    }

    const gainers = [...stockQuotes]
      .sort((a, b) => b.pctChange - a.pctChange)
      .slice(0, 4)
      .map(toMarketMover);
    const losers = [...stockQuotes]
      .sort((a, b) => a.pctChange - b.pctChange)
      .slice(0, 4)
      .map(toMarketMover);
    const turnoverLeaders = [...stockQuotes].slice(0, 4).map(toMarketMover);
    const totalAmount = stockQuotes.reduce((sum, quote) => sum + quote.amount, 0);
    const shAmount = stockQuotes
      .filter((quote) => quote.stock.market === "SH")
      .reduce((sum, quote) => sum + quote.amount, 0);
    const szAmount = stockQuotes
      .filter((quote) => quote.stock.market === "SZ")
      .reduce((sum, quote) => sum + quote.amount, 0);
    const rising = stockQuotes.filter((quote) => quote.pctChange > 0).length;
    const falling = stockQuotes.filter((quote) => quote.pctChange < 0).length;

    return await buildApiResponse<MarketOverviewData>({
      taskTypes: ["market", "all"],
      source: "database",
      updatedAt: latestDate(quotes.map((quote) => quote.tradeDate)),
      partial: indexQuotes.length !== 3,
      data: {
        indexData: indexQuotes.length === 3 ? indexQuotes : indexData,
        marketOverview: {
          ...mockMarketOverview,
          breadth: {
            rising,
            falling,
            unchanged: stockQuotes.length - rising - falling,
            limitUp: stockQuotes.filter((quote) => quote.pctChange >= 9.8).length,
            limitDown: stockQuotes.filter((quote) => quote.pctChange <= -9.8).length,
          },
          turnover: {
            total: formatYi(totalAmount),
            sh: formatYi(shAmount),
            sz: formatYi(szAmount),
            change:
              indexQuotes.length === 3 ? "AkShare 刷新后聚合" : mockMarketOverview.turnover.change,
          },
        },
        marketMovers: {
          gainers,
          losers,
          turnoverLeaders,
        },
        intradayMarketFlow,
      },
    });
  } catch (error) {
    return await mockMarketEnvelope(
      error instanceof Error ? error.message : "接口异常",
    );
  }
}

export async function getSectors() {
  if (!prisma) {
    const warning = getDatabaseFallbackWarning();

    return await buildApiResponse<SectorOverviewData>({
      taskTypes: ["sectors", "all"],
      source: "mock-fallback",
      fallbackReason: warning,
      error: warning,
      warning,
      data: {
        sectorRankings: dedupeSectorRankings(sectorRankings),
      },
    });
  }

  try {
    const rows = await prisma.sectorDailyStat.findMany({
      orderBy: [{ hotScore: "desc" }, { amount: "desc" }],
    });

    if (rows.length === 0) {
      return await buildApiResponse<SectorOverviewData>({
        taskTypes: ["sectors", "all"],
        source: "mock-fallback",
        fallbackReason: "数据库暂无板块数据",
        error: "数据库暂无板块数据",
        warning: "数据库暂无板块数据",
        data: {
          sectorRankings: dedupeSectorRankings(sectorRankings),
        },
      });
    }

    const sectors = dedupeSectorRankings(rows.map((row, index) => ({
      rank: index + 1,
      name: row.sectorName,
      changePercent: formatPercent(row.pctChange),
      turnover: formatYi(row.amount),
      heat: row.hotScore,
      limitUp: row.limitUpCount,
      leader: row.leadingStock,
      riskLevel: row.riskLevel as SectorRanking["riskLevel"],
      focus: row.focusLevel as SectorRanking["focus"],
      rotation: "来自本地 SQLite 的模拟板块数据，后续可接真实行情后更新。",
    })));

    return await buildApiResponse<SectorOverviewData>({
      taskTypes: ["sectors", "all"],
      source: "database",
      updatedAt: latestDate(rows.map((row) => row.tradeDate)),
      data: {
        sectorRankings: sectors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接口异常";

    return await buildApiResponse<SectorOverviewData>({
      taskTypes: ["sectors", "all"],
      source: "mock-fallback",
      fallbackReason: message,
      error: message,
      warning: message,
      data: {
        sectorRankings: dedupeSectorRankings(sectorRankings),
      },
    });
  }
}

export async function getStocks() {
  if (!prisma) {
    const warning = getDatabaseFallbackWarning();

    return await buildApiResponse<StocksOverviewData>({
      taskTypes: ["stocks", "all"],
      source: "mock-fallback",
      fallbackReason: warning,
      error: warning,
      warning,
      data: {
        stockWatchlist,
      },
    });
  }

  try {
    const rows = await prisma.stockScore.findMany({
      include: {
        stock: {
          include: {
            quotes: {
              orderBy: { tradeDate: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ totalScore: "desc" }, { tradeDate: "desc" }],
    });

    if (rows.length === 0) {
      return await buildApiResponse<StocksOverviewData>({
        taskTypes: ["stocks", "all"],
        source: "mock-fallback",
        fallbackReason: "数据库暂无个股评分数据",
        error: "数据库暂无个股评分数据",
        warning: "数据库暂无个股评分数据",
        data: {
          stockWatchlist,
        },
      });
    }

    const stocks: StockWatchItem[] = rows.map((row) => {
      const quote = row.stock.quotes[0];

      return {
        code: row.stockCode,
        name: row.stock.name,
        sector: row.stock.sector,
        latestPrice: quote ? formatPrice(quote.close) : "--",
        changePercent: quote ? formatPercent(quote.pctChange) : "0.00%",
        score: row.totalScore,
        rating: row.rating as StockWatchItem["rating"],
        buyTrigger: row.buyTrigger,
        stopLoss: row.stopLoss,
        takeProfit: row.takeProfit,
        risk: row.riskNote,
      };
    });

    return await buildApiResponse<StocksOverviewData>({
      taskTypes: ["stocks", "all"],
      source: "database",
      updatedAt: latestDate(
        rows.flatMap((row) => [row.tradeDate, row.stock.quotes[0]?.tradeDate ?? null]),
      ),
      data: {
        stockWatchlist: stocks,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接口异常";

    return await buildApiResponse<StocksOverviewData>({
      taskTypes: ["stocks", "all"],
      source: "mock-fallback",
      fallbackReason: message,
      error: message,
      warning: message,
      data: {
        stockWatchlist,
      },
    });
  }
}

export async function getStockDetail(code: string) {
  if (!prisma) {
    const fallback = stockWatchlist.find((item) => item.code === code);
    const warning = getDatabaseFallbackWarning();

    return await buildApiResponse<StockDetailData>({
      taskTypes: ["stocks", "all"],
      source: "mock-fallback",
      fallbackReason: warning,
      error: warning,
      warning,
      data: {
        stock: fallback
          ? {
              code: fallback.code,
              name: fallback.name,
              market: fallback.code.startsWith("6") ? "SH" : "SZ",
              sector: fallback.sector,
              industry: fallback.sector,
              isST: false,
            }
          : null,
        quotes: [],
        score: fallback ?? null,
      },
    });
  }

  try {
    const stock = await prisma.stock.findUnique({
      where: { code },
      include: {
        quotes: {
          orderBy: { tradeDate: "desc" },
          take: 20,
        },
        scores: {
          orderBy: { tradeDate: "desc" },
          take: 1,
        },
      },
    });

    if (!stock) {
      const fallback = stockWatchlist.find((item) => item.code === code);
      const message = fallback ? "数据库暂无该股票详情" : "未找到股票";

      return await buildApiResponse<StockDetailData>({
        taskTypes: ["stocks", "all"],
        source: "mock-fallback",
        fallbackReason: message,
        error: message,
        warning: message,
        data: {
          stock: fallback
            ? {
                code: fallback.code,
                name: fallback.name,
                market: fallback.code.startsWith("6") ? "SH" : "SZ",
                sector: fallback.sector,
                industry: fallback.sector,
                isST: false,
              }
            : null,
          quotes: [],
          score: fallback ?? null,
        },
      });
    }

    const score = stock.scores[0];

    return await buildApiResponse<StockDetailData>({
      taskTypes: ["stocks", "all"],
      source: "database",
      updatedAt: latestDate([
        stock.quotes[0]?.tradeDate ?? null,
        score?.tradeDate ?? null,
      ]),
      data: {
        stock: {
          code: stock.code,
          name: stock.name,
          market: stock.market,
          sector: stock.sector,
          industry: stock.industry,
          isST: stock.isST,
        },
        quotes: stock.quotes.map((quote) => ({
          tradeDate: formatDate(quote.tradeDate),
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          volume: quote.volume,
          amount: quote.amount,
          pctChange: quote.pctChange,
          turnoverRate: quote.turnoverRate,
        })),
        score: score
          ? {
              tradeDate: formatDate(score.tradeDate),
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
            }
          : null,
      },
    });
  } catch (error) {
    const fallback = stockWatchlist.find((item) => item.code === code);
    const message = error instanceof Error ? error.message : "接口异常";

    return await buildApiResponse<StockDetailData>({
      taskTypes: ["stocks", "all"],
      source: "mock-fallback",
      fallbackReason: message,
      error: message,
      warning: message,
      data: {
        stock: fallback
          ? {
              code: fallback.code,
              name: fallback.name,
              market: fallback.code.startsWith("6") ? "SH" : "SZ",
              sector: fallback.sector,
              industry: fallback.sector,
              isST: false,
            }
          : null,
        quotes: [],
        score: fallback ?? null,
      },
    });
  }
}

export async function getLatestReport() {
  if (!prisma) {
    const warning = getDatabaseFallbackWarning();

    return await buildApiResponse<LatestReportData>({
      taskTypes: ["report"],
      source: "mock-fallback",
      fallbackReason: warning,
      error: warning,
      warning,
      data: {
        dailyReport: mockDailyReport,
        riskWarning:
          "本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。股市有风险，交易需谨慎。所有买卖决策由用户自行承担。",
      },
    });
  }

  try {
    const report = await prisma.dailyReport.findFirst({
      orderBy: { reportDate: "desc" },
    });

    if (!report) {
      return await buildApiResponse<LatestReportData>({
        taskTypes: ["report"],
        source: "mock-fallback",
        fallbackReason: "数据库暂无投研报告",
        error: "数据库暂无投研报告",
        warning: "数据库暂无投研报告",
        data: {
          dailyReport: mockDailyReport,
          riskWarning:
            "本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。股市有风险，交易需谨慎。所有买卖决策由用户自行承担。",
        },
      });
    }

    const mapped: DailyReport = {
      date: formatDate(report.reportDate),
      conclusion: report.marketSummary,
      indexPerformance: safeJson<string[]>(
        report.indexPerformance,
        mockDailyReport.indexPerformance,
      ),
      sectorOrder: safeJson<string[]>(report.hotSectors, mockDailyReport.sectorOrder),
      watchTargets: safeJson<DailyReportStock[]>(
        report.watchlist,
        mockDailyReport.watchTargets,
      ),
      previousReview: safeJson<string[]>(
        report.previousReview,
        mockDailyReport.previousReview,
      ),
      avoidDirections: safeJson<string[]>(
        report.avoidDirections,
        mockDailyReport.avoidDirections,
      ),
    };

    return await buildApiResponse<LatestReportData>({
      taskTypes: ["report"],
      source: "database",
      updatedAt: report.updatedAt,
      data: {
        dailyReport: mapped,
        riskWarning: report.riskWarning,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接口异常";

    return await buildApiResponse<LatestReportData>({
      taskTypes: ["report"],
      source: "mock-fallback",
      fallbackReason: message,
      error: message,
      warning: message,
      data: {
        dailyReport: mockDailyReport,
        riskWarning:
          "本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。股市有风险，交易需谨慎。所有买卖决策由用户自行承担。",
      },
    });
  }
}

export async function getJournal() {
  if (!prisma) {
    const warning = getDatabaseFallbackWarning();

    return await buildApiResponse<JournalData>({
      taskTypes: ["stocks", "all"],
      source: "mock-fallback",
      fallbackReason: warning,
      error: warning,
      warning,
      data: {
        tradeJournal: mockTradeJournal,
      },
    });
  }

  try {
    const rows = await prisma.tradeJournal.findMany({
      orderBy: { buyDate: "desc" },
    });

    if (rows.length === 0) {
      return await buildApiResponse<JournalData>({
        taskTypes: ["stocks", "all"],
        source: "mock-fallback",
        fallbackReason: "数据库暂无交易复盘记录",
        error: "数据库暂无交易复盘记录",
        warning: "数据库暂无交易复盘记录",
        data: {
          tradeJournal: mockTradeJournal,
        },
      });
    }

    const records = rows.map((row) => ({
      code: row.stockCode,
      name: row.stockName,
      buyDate: formatDate(row.buyDate),
      buyPrice: formatPrice(row.buyPrice),
      sellDate: row.sellDate ? formatDate(row.sellDate) : "持仓中",
      sellPrice: row.sellPrice ? formatPrice(row.sellPrice) : "--",
      position: `${row.positionSize.toFixed(0)}%`,
      pnlPercent:
        typeof row.profitLossPct === "number"
          ? formatPercent(row.profitLossPct)
          : "0.00%",
      buyReason: row.buyReason,
      sellReason: row.sellReason ?? "尚未卖出",
      review: row.reviewNote,
    }));
    const wins = rows.filter((row) => (row.profitLossPct ?? 0) > 0).length;
    const totalReturn = rows.reduce((sum, row) => sum + (row.profitLossPct ?? 0), 0);
    const currentPositions = rows.filter((row) => !row.sellDate).length;
    const tradeJournal: TradeJournal = {
      stats: {
        totalTrades: rows.length,
        winRate: `${((wins / rows.length) * 100).toFixed(1)}%`,
        totalReturn: formatPercent(totalReturn),
        maxDrawdown: mockTradeJournal.stats.maxDrawdown,
        currentPositions,
      },
      pnlCurve: mockTradeJournal.pnlCurve,
      records,
    };

    return await buildApiResponse<JournalData>({
      taskTypes: ["stocks", "all"],
      source: "database",
      updatedAt: latestDate(rows.map((row) => row.updatedAt)),
      data: {
        tradeJournal,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接口异常";

    return await buildApiResponse<JournalData>({
      taskTypes: ["stocks", "all"],
      source: "mock-fallback",
      fallbackReason: message,
      error: message,
      warning: message,
      data: {
        tradeJournal: mockTradeJournal,
      },
    });
  }
}

export async function createJournalRecord(input: unknown) {
  if (!prisma) {
    throw new Error(getDatabaseFallbackWarning());
  }

  if (!input || typeof input !== "object") {
    throw new Error("请求体不能为空");
  }

  const body = input as Record<string, unknown>;
  const required = ["stockCode", "stockName", "buyDate", "buyPrice", "positionSize", "buyReason"];
  const missing = required.filter((key) => !body[key]);

  if (missing.length > 0) {
    throw new Error(`缺少字段：${missing.join(", ")}`);
  }

  const buyPrice = Number(body.buyPrice);
  const sellPrice = body.sellPrice ? Number(body.sellPrice) : null;
  const profitLoss = sellPrice === null ? null : Number((sellPrice - buyPrice).toFixed(2));
  const profitLossPct =
    sellPrice === null ? null : Number((((sellPrice - buyPrice) / buyPrice) * 100).toFixed(2));

  return prisma.tradeJournal.create({
    data: {
      stockCode: String(body.stockCode),
      stockName: String(body.stockName),
      buyDate: new Date(`${String(body.buyDate)}T00:00:00.000Z`),
      buyPrice,
      sellDate: body.sellDate ? new Date(`${String(body.sellDate)}T00:00:00.000Z`) : null,
      sellPrice,
      positionSize: Number(body.positionSize),
      stopLoss: String(body.stopLoss ?? ""),
      takeProfit: String(body.takeProfit ?? ""),
      buyReason: String(body.buyReason),
      sellReason: body.sellReason ? String(body.sellReason) : null,
      profitLoss,
      profitLossPct,
      reviewNote: String(body.reviewNote ?? "待复盘"),
    },
  });
}
