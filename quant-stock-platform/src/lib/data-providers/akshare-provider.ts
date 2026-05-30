import { dailyReport } from "@/lib/mock-data";
import { getProviderConfiguration } from "@/lib/data-providers/config";
import { dedupeSectorRankings } from "@/lib/sector-utils";
import type {
  DataProvider,
  ProviderDailyQuote,
  ProviderIndexQuote,
  ProviderMarketSnapshot,
  ProviderStatus,
  ProviderStock,
  ProviderStockScore,
} from "@/lib/data-providers/types";
import { runPythonJsonScript, probePythonEnvironment } from "@/lib/server/python-runner";
import type { IndexDatum, MarketOverview, SectorRanking } from "@/lib/types";

type AkshareMarketScriptPayload = {
  ok: boolean;
  partial: boolean;
  indices: Array<{
    name: string;
    code: string;
    value: number;
    changePercent: number;
    changePoints: number;
    volume: number;
    amount: number;
    open: number;
    high: number;
    low: number;
    previousClose: number;
  }>;
  breadth: ProviderMarketSnapshot["breadth"];
  turnover: {
    total: number;
    sh: number;
    sz: number;
  };
  sentiment: ProviderMarketSnapshot["sentiment"];
  riskLevel: string;
  message: string;
};

type AkshareStockScriptPayload = {
  ok: boolean;
  partial: boolean;
  limit: number;
  totalCount: number;
  stocks: Array<{
    code: string;
    name: string;
    latestPrice: number;
    pctChange: number;
    volume: number;
    amount: number;
    turnoverRate: number;
    market: string;
    sector: string;
    industry: string;
    isST: boolean;
    open: number;
    high: number;
    low: number;
    previousClose: number;
  }>;
};

type AkshareSectorScriptPayload = {
  ok: boolean;
  partial: boolean;
  sectors: Array<{
    sectorName: string;
    pctChange: number;
    amount: number;
    hotScore: number;
    leadingStock: string;
    limitUpCount: number;
    riskLevel: SectorRanking["riskLevel"];
    focusLevel: SectorRanking["focus"];
  }>;
};

type CacheRecord<T> = {
  expiresAt: number;
  data: T;
};

const CACHE_WINDOW_MS = 120_000;
const INDEX_TIMES = ["09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00"];

let marketCache: CacheRecord<ProviderMarketSnapshot> | null = null;
let stockCache: CacheRecord<AkshareStockScriptPayload> | null = null;
let sectorCache: CacheRecord<AkshareSectorScriptPayload> | null = null;

function now() {
  return Date.now();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function withCache<T>(
  cache: CacheRecord<T> | null,
  loader: () => Promise<T>,
  assign: (value: CacheRecord<T> | null) => void,
) {
  if (cache && cache.expiresAt > now()) {
    return cache.data;
  }

  const data = await loader();
  assign({
    expiresAt: now() + CACHE_WINDOW_MS,
    data,
  });

  return data;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatYi(value: number) {
  return `${Math.round(value / 100_000_000).toLocaleString("en-US")} 亿`;
}

function formatChangePoints(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function buildIndexSeries(index: ProviderIndexQuote) {
  const base = index.previousClose || index.close;
  const path = [
    index.open || base,
    (index.open + index.close) / 2,
    index.high || Math.max(index.open, index.close),
    (index.high + index.close) / 2,
    (index.open + index.close) / 2,
    Math.max(index.low, index.close * 0.998),
    (index.low + index.close) / 2,
    (index.close + index.high) / 2,
    index.close,
  ];

  return INDEX_TIMES.map((time, indexPoint) => ({
    time,
    value: Number(path[indexPoint].toFixed(2)),
  }));
}

function scoreTrend(pctChange: number) {
  if (pctChange >= 1 && pctChange <= 5) return 34;
  if (pctChange > 5 && pctChange <= 8) return 28;
  if (pctChange > 0 && pctChange < 1) return 24;
  if (pctChange >= -2 && pctChange <= 0) return 18;
  if (pctChange < -2 && pctChange > -5) return 10;
  if (pctChange > 8) return 18;
  return 6;
}

function scoreVolume(amount: number) {
  if (amount >= 20_000_000_000) return 30;
  if (amount >= 10_000_000_000) return 25;
  if (amount >= 5_000_000_000) return 20;
  if (amount >= 2_000_000_000) return 14;
  if (amount >= 500_000_000) return 8;
  return 4;
}

function scoreTurnover(turnoverRate: number) {
  if (turnoverRate >= 2 && turnoverRate <= 10) return 24;
  if (turnoverRate > 10 && turnoverRate <= 18) return 16;
  if (turnoverRate > 0 && turnoverRate < 2) return 10;
  return 6;
}

function riskPenalty(pctChange: number, turnoverRate: number) {
  let risk = 0;

  if (pctChange > 8) {
    risk += 18;
  }

  if (pctChange < -5) {
    risk += 16;
  }

  if (turnoverRate > 18) {
    risk += 8;
  }

  return risk;
}

function buildRating(totalScore: number): ProviderStockScore["rating"] {
  if (totalScore >= 80) {
    return "强观察";
  }

  if (totalScore >= 65) {
    return "谨慎观察";
  }

  return "暂不关注";
}

function buildRiskNote(pctChange: number, turnoverRate: number) {
  if (pctChange > 8) {
    return "短线涨幅偏大，谨防高位回撤。";
  }

  if (pctChange < -5) {
    return "弱势明显，优先等待止跌确认。";
  }

  if (turnoverRate > 18) {
    return "换手率偏高，短线博弈情绪较强。";
  }

  return "仅作研究观察，需结合板块与成交持续性。";
}

function buildReason(stock: AkshareStockScriptPayload["stocks"][number], totalScore: number) {
  const reasons = [
    `${stock.name} 当日涨跌幅 ${stock.pctChange.toFixed(2)}%，趋势得分 ${scoreTrend(stock.pctChange)}。`,
    `成交额 ${formatYi(stock.amount)}，流动性得分 ${scoreVolume(stock.amount)}。`,
    `换手率 ${stock.turnoverRate.toFixed(2)}%，节奏得分 ${scoreTurnover(stock.turnoverRate)}。`,
    `模型总分 ${totalScore}，仅用于研究与复盘，不构成投资建议。`,
  ];

  return reasons.join(" ");
}

async function loadMarketSnapshot() {
  return await withCache(
    marketCache,
    async () => {
      const payload = await runPythonJsonScript<AkshareMarketScriptPayload>(
        "scripts/akshare/fetch_market.py",
        { timeoutMs: 80_000 },
      );

      const tradeDate = startOfToday();

      return {
        tradeDate,
        partial: payload.partial,
        message: payload.message,
        indices: payload.indices.map((index) => ({
          code: index.code,
          name: index.name,
          market: "INDEX",
          tradeDate,
          open: index.open,
          high: index.high,
          low: index.low,
          close: index.value,
          previousClose: index.previousClose || index.value - index.changePoints,
          volume: index.volume,
          amount: index.amount,
          pctChange: index.changePercent,
          changePoints: index.changePoints,
        })),
        breadth: payload.breadth,
        turnover: {
          total: payload.turnover.total,
          sh: payload.turnover.sh,
          sz: payload.turnover.sz,
          changePercent: null,
        },
        sentiment: payload.sentiment,
        riskLevel: payload.riskLevel,
      } satisfies ProviderMarketSnapshot;
    },
    (value) => {
      marketCache = value;
    },
  );
}

async function loadStocksPayload() {
  return await withCache(
    stockCache,
    async () =>
      await runPythonJsonScript<AkshareStockScriptPayload>(
        "scripts/akshare/fetch_stocks.py",
        {
          args: ["--limit", process.env.AKSHARE_STOCK_LIMIT?.trim() || "600"],
          timeoutMs: 90_000,
        },
      ),
    (value) => {
      stockCache = value;
    },
  );
}

async function loadSectorPayload() {
  return await withCache(
    sectorCache,
    async () =>
      await runPythonJsonScript<AkshareSectorScriptPayload>(
        "scripts/akshare/fetch_sectors.py",
        {
          args: ["--limit", process.env.AKSHARE_SECTOR_LIMIT?.trim() || "20"],
          timeoutMs: 40_000,
        },
      ),
    (value) => {
      sectorCache = value;
    },
  );
}

async function buildStatus(): Promise<ProviderStatus> {
  const config = getProviderConfiguration();
  const python = await probePythonEnvironment();

  if (!python.available) {
    return {
      provider: "akshare",
      label: "AkShare",
      status: "error",
      available: false,
      message:
        config.warningMessage ??
        python.errorMessage ??
        "Python 不可用，无法执行 AkShare 脚本。",
      warning: config.warningMessage ?? config.databaseWarning ?? null,
      fallbackEnabled: true,
      configuredProvider: config.configuredProvider,
      resolvedProvider: config.resolvedProvider,
      isProduction: config.isProduction,
      databaseAvailable: config.databaseAvailable,
      databaseWarning: config.databaseWarning,
      pythonAvailable: false,
      pythonCommand: python.command,
      pythonVersion: python.version,
      akshareInstalled: false,
      pandasInstalled: false,
    };
  }

  if (!python.akshareInstalled || !python.pandasInstalled) {
    return {
      provider: "akshare",
      label: "AkShare",
      status: "degraded",
      available: false,
      message:
        config.warningMessage ??
        "Python 可用，但缺少 AkShare 或 pandas 依赖，请先安装 requirements。",
      warning: config.warningMessage ?? config.databaseWarning ?? null,
      fallbackEnabled: true,
      configuredProvider: config.configuredProvider,
      resolvedProvider: config.resolvedProvider,
      isProduction: config.isProduction,
      databaseAvailable: config.databaseAvailable,
      databaseWarning: config.databaseWarning,
      pythonAvailable: true,
      pythonCommand: python.command,
      pythonVersion: python.version,
      akshareInstalled: python.akshareInstalled,
      pandasInstalled: python.pandasInstalled,
    };
  }

  return {
    provider: "akshare",
    label: "AkShare",
    status: "ready",
    available: true,
    message:
      config.warningMessage ??
      "AkShare provider 已就绪，可通过 Python 脚本获取公开 A 股行情。",
    warning: config.warningMessage ?? config.databaseWarning ?? null,
    fallbackEnabled: true,
    configuredProvider: config.configuredProvider,
    resolvedProvider: config.resolvedProvider,
    isProduction: config.isProduction,
    databaseAvailable: config.databaseAvailable,
    databaseWarning: config.databaseWarning,
    pythonAvailable: true,
    pythonCommand: python.command,
    pythonVersion: python.version,
    akshareInstalled: true,
    pandasInstalled: true,
  };
}

export const akshareProvider: DataProvider = {
  name: "akshare",
  label: "AkShare",
  async getStatus() {
    return await buildStatus();
  },
  async getMarketSnapshot() {
    return await loadMarketSnapshot();
  },
  async getMarketOverview() {
    const snapshot = await loadMarketSnapshot();

    return {
      breadth: snapshot.breadth,
      turnover: {
        total: formatYi(snapshot.turnover.total),
        sh: formatYi(snapshot.turnover.sh),
        sz: formatYi(snapshot.turnover.sz),
        change: snapshot.partial ? "数据可能不完整" : "实时聚合",
      },
      sentiment: snapshot.sentiment,
      riskLevel: snapshot.riskLevel,
    } satisfies MarketOverview;
  },
  async getIndexQuotes() {
    const snapshot = await loadMarketSnapshot();

    return snapshot.indices.map((index) => ({
      name: index.name,
      code: index.code,
      value: formatNumber(index.close),
      changePercent: formatPercent(index.pctChange),
      changePoints: formatChangePoints(index.changePoints),
      trend: index.pctChange >= 0 ? "up" : "down",
      series: buildIndexSeries(index),
    })) satisfies IndexDatum[];
  },
  async getSectorRankings() {
    const payload = await loadSectorPayload();

    return dedupeSectorRankings(payload.sectors.map((sector, index) => ({
      rank: index + 1,
      name: sector.sectorName,
      changePercent: formatPercent(sector.pctChange),
      turnover: formatYi(sector.amount),
      heat: sector.hotScore,
      limitUp: sector.limitUpCount,
      leader: sector.leadingStock || "未知",
      riskLevel: sector.riskLevel,
      focus: sector.focusLevel,
      rotation: payload.partial
        ? "AkShare 板块字段存在缺失，当前为降级整理结果。"
        : "AkShare 真实板块行情，适合用作轮动观察与复盘。",
    })));
  },
  async getStockList(): Promise<ProviderStock[]> {
    const payload = await loadStocksPayload();

    return payload.stocks.map((stock) => ({
      code: stock.code,
      name: stock.name,
      market: stock.market,
      sector: stock.sector || "未知板块",
      industry: stock.industry || stock.sector || "未知行业",
      isST: stock.isST,
    }));
  },
  async getStockDailyQuotes(stockCode: string): Promise<ProviderDailyQuote[]> {
    const payload = await loadStocksPayload();
    const stock = payload.stocks.find((item) => item.code === stockCode);

    if (!stock) {
      return [];
    }

    return [
      {
        stockCode: stock.code,
        tradeDate: startOfToday(),
        open: stock.open || stock.latestPrice,
        high: stock.high || stock.latestPrice,
        low: stock.low || stock.latestPrice,
        close: stock.latestPrice,
        volume: stock.volume,
        amount: stock.amount,
        pctChange: stock.pctChange,
        turnoverRate: stock.turnoverRate,
      },
    ];
  },
  async getStockScores(): Promise<ProviderStockScore[]> {
    const payload = await loadStocksPayload();
    const tradeDate = startOfToday();

    return payload.stocks.map((stock) => {
      const trendScore = scoreTrend(stock.pctChange);
      const volumeScore = scoreVolume(stock.amount);
      const liquidityScore = scoreTurnover(stock.turnoverRate);
      const riskScore = riskPenalty(stock.pctChange, stock.turnoverRate);
      const totalScore = Math.max(
        0,
        Math.min(100, trendScore + volumeScore + liquidityScore - riskScore),
      );
      const rating = buildRating(totalScore);
      const buyTrigger = `关注 ${stock.name} 是否放量站上 ${stock.high.toFixed(2)}。`;
      const stopLoss = `${(stock.latestPrice * 0.95).toFixed(2)} 附近`;
      const takeProfit = `${(stock.latestPrice * 1.06).toFixed(2)} - ${(stock.latestPrice * 1.12).toFixed(2)}`;

      return {
        stockCode: stock.code,
        tradeDate,
        trendScore,
        volumeScore,
        sectorScore: liquidityScore,
        fundScore: 0,
        riskScore,
        totalScore,
        rating,
        buyTrigger,
        stopLoss,
        takeProfit,
        riskNote: buildRiskNote(stock.pctChange, stock.turnoverRate),
        reason: buildReason(stock, totalScore),
      };
    });
  },
  async getLatestReport() {
    return {
      ...dailyReport,
      date: new Date().toISOString().slice(0, 10),
    };
  },
};
