import {
  dailyReport,
  indexData,
  marketMovers,
  marketOverview,
  sectorRankings,
  stockWatchlist,
} from "@/lib/mock-data";
import { getProviderConfiguration } from "@/lib/data-providers/config";
import type {
  DataProvider,
  ProviderDailyQuote,
  ProviderMarketSnapshot,
  ProviderStock,
  ProviderStockScore,
} from "@/lib/data-providers/types";
import { dedupeSectorRankings } from "@/lib/sector-utils";

const tradeDate = new Date("2026-05-30T00:00:00.000Z");

function parseNumber(value: string) {
  return Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
}

function parsePercent(value: string) {
  return Number(value.replace("%", ""));
}

function parseAmountYi(value: string) {
  return parseNumber(value) * 100_000_000;
}

function toMockMarketSnapshot(): ProviderMarketSnapshot {
  const shAmount = parseAmountYi(marketOverview.turnover.sh);
  const szAmount = parseAmountYi(marketOverview.turnover.sz);

  return {
    tradeDate,
    partial: false,
    message: "当前使用本地 mock provider，不请求真实行情。",
    indices: indexData.map((index) => {
      const close = parseNumber(index.value);
      const changePoints = parseNumber(index.changePoints);
      const previousClose = close - changePoints;
      const open = Number((previousClose * 1.001).toFixed(2));
      const high = Number(Math.max(close, open) * 1.004);
      const low = Number(Math.min(close, open) * 0.996);
      const amount =
        index.name === "上证指数"
          ? shAmount
          : index.name === "深证成指"
            ? szAmount
            : Math.round(szAmount * 0.42);

      return {
        code: index.code,
        name: index.name,
        market: "INDEX",
        tradeDate,
        open,
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close,
        previousClose,
        volume: Math.round(amount / Math.max(close, 1)),
        amount,
        pctChange: parsePercent(index.changePercent),
        changePoints,
      };
    }),
    breadth: marketOverview.breadth,
    turnover: {
      total: parseAmountYi(marketOverview.turnover.total),
      sh: shAmount,
      sz: szAmount,
      changePercent: parsePercent(marketOverview.turnover.change),
    },
    sentiment: marketOverview.sentiment,
    riskLevel: marketOverview.riskLevel,
  };
}

function marketFromCode(code: string) {
  if (code.startsWith("6")) return "SH";
  if (code.startsWith("8") || code.startsWith("4")) return "BJ";

  return "SZ";
}

function uniqueStockInputs() {
  const stockMap = new Map<
    string,
    {
      code: string;
      name: string;
      sector: string;
      price: string;
      changePercent: string;
      amount: string;
    }
  >();

  for (const stock of stockWatchlist) {
    stockMap.set(stock.code, {
      code: stock.code,
      name: stock.name,
      sector: stock.sector,
      price: stock.latestPrice,
      changePercent: stock.changePercent,
      amount: "36 亿",
    });
  }

  for (const stock of [
    ...marketMovers.gainers,
    ...marketMovers.losers,
    ...marketMovers.turnoverLeaders,
  ]) {
    stockMap.set(stock.code, {
      code: stock.code,
      name: stock.name,
      sector: stock.sector,
      price: stock.price,
      changePercent: stock.changePercent,
      amount: stock.turnover,
    });
  }

  return [...stockMap.values()];
}

export const mockProvider: DataProvider = {
  name: "mock",
  label: "Mock Data",
  async getStatus() {
    const config = getProviderConfiguration();

    return {
      provider: "mock",
      label: "Mock Data",
      status: "ready",
      available: true,
      message:
        config.warningMessage ??
        config.databaseWarning ??
        "当前使用本地 mock provider，不请求真实行情。",
      warning: config.warningMessage ?? config.databaseWarning ?? null,
      fallbackEnabled: true,
      configuredProvider: config.configuredProvider,
      resolvedProvider: config.resolvedProvider,
      isProduction: config.isProduction,
      databaseAvailable: config.databaseAvailable,
      databaseWarning: config.databaseWarning,
    };
  },
  async getMarketSnapshot() {
    return toMockMarketSnapshot();
  },
  async getMarketOverview() {
    return marketOverview;
  },
  async getIndexQuotes() {
    return indexData;
  },
  async getSectorRankings() {
    return dedupeSectorRankings(sectorRankings);
  },
  async getStockList(): Promise<ProviderStock[]> {
    return uniqueStockInputs().map((stock) => ({
      code: stock.code,
      name: stock.name,
      market: marketFromCode(stock.code),
      sector: stock.sector,
      industry: stock.sector,
      isST: false,
    }));
  },
  async getStockDailyQuotes(stockCode: string): Promise<ProviderDailyQuote[]> {
    const stock = uniqueStockInputs().find((item) => item.code === stockCode);

    if (!stock) {
      return [];
    }

    const close = parseNumber(stock.price);
    const pctChange = parsePercent(stock.changePercent);
    const previousClose = close / (1 + pctChange / 100);
    const amount = parseAmountYi(stock.amount);

    return [
      {
        stockCode: stock.code,
        tradeDate,
        open: Number((previousClose * 1.002).toFixed(2)),
        high: Number((close * 1.026).toFixed(2)),
        low: Number((close * 0.974).toFixed(2)),
        close,
        volume: Math.round(amount / Math.max(close, 1)),
        amount,
        pctChange,
        turnoverRate: 3.28,
      },
    ];
  },
  async getStockScores(): Promise<ProviderStockScore[]> {
    return stockWatchlist.map((stock) => ({
      stockCode: stock.code,
      tradeDate,
      trendScore: Math.min(95, Math.max(45, stock.score + 4)),
      volumeScore: Math.min(95, Math.max(45, stock.score - 2)),
      sectorScore: Math.min(95, Math.max(45, stock.score + 1)),
      fundScore: Math.min(95, Math.max(45, stock.score - 4)),
      riskScore: Math.min(95, Math.max(45, 100 - Math.round(stock.score / 3))),
      totalScore: stock.score,
      rating: stock.rating,
      buyTrigger: stock.buyTrigger,
      stopLoss: stock.stopLoss,
      takeProfit: stock.takeProfit,
      riskNote: stock.risk,
      reason: `${stock.sector}方向观察，综合评分 ${stock.score}`,
    }));
  },
  async getLatestReport() {
    return dailyReport;
  },
};
