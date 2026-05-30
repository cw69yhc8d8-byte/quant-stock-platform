import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

import {
  dailyReport,
  marketMovers,
  riskDisclaimer,
  sectorRankings,
  stockWatchlist,
  tradeJournal,
} from "../src/lib/mock-data";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

const tradeDate = new Date("2026-05-30T00:00:00.000Z");

type SeedStock = {
  code: string;
  name: string;
  sector: string;
  price: string;
  changePercent: string;
  amount: string;
};

function parseNumber(value: string) {
  return Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
}

function parsePercent(value: string) {
  return Number(value.replace("%", ""));
}

function parseAmountYi(value: string) {
  return parseNumber(value) * 100_000_000;
}

function marketFromCode(code: string) {
  if (code.startsWith("6")) return "SH";
  if (code.startsWith("8") || code.startsWith("4")) return "BJ";

  return "SZ";
}

function uniqueStocks() {
  const stockMap = new Map<string, SeedStock>();

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

async function main() {
  await prisma.tradeJournal.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.stockScore.deleteMany();
  await prisma.sectorDailyStat.deleteMany();
  await prisma.dailyQuote.deleteMany();
  await prisma.stock.deleteMany();

  const stocks = uniqueStocks();

  await prisma.stock.createMany({
    data: stocks.map((stock) => ({
      code: stock.code,
      name: stock.name,
      market: marketFromCode(stock.code),
      sector: stock.sector,
      industry: stock.sector,
      isST: false,
    })),
  });

  await prisma.dailyQuote.createMany({
    data: stocks.map((stock, index) => {
      const close = parseNumber(stock.price);
      const pctChange = parsePercent(stock.changePercent);
      const previousClose = close / (1 + pctChange / 100);
      const amount = parseAmountYi(stock.amount);

      return {
        stockCode: stock.code,
        tradeDate,
        open: Number((previousClose * (1 + (index % 3) * 0.002)).toFixed(2)),
        high: Number((close * 1.026).toFixed(2)),
        low: Number((close * 0.974).toFixed(2)),
        close,
        volume: Math.round(amount / Math.max(close, 1)),
        amount,
        pctChange,
        turnoverRate: Number((2.1 + (index % 6) * 0.7).toFixed(2)),
      };
    }),
  });

  await prisma.sectorDailyStat.createMany({
    data: sectorRankings.map((sector) => ({
      sectorName: sector.name,
      tradeDate,
      pctChange: parsePercent(sector.changePercent),
      amount: parseAmountYi(sector.turnover),
      limitUpCount: sector.limitUp,
      hotScore: sector.heat,
      leadingStock: sector.leader,
      riskLevel: sector.riskLevel,
      focusLevel: sector.focus,
    })),
  });

  await prisma.stockScore.createMany({
    data: stockWatchlist.map((stock) => {
      const trendScore = Math.min(95, Math.max(45, stock.score + 4));
      const volumeScore = Math.min(95, Math.max(45, stock.score - 2));
      const sectorScore = Math.min(95, Math.max(45, stock.score + 1));
      const fundScore = Math.min(95, Math.max(45, stock.score - 4));
      const riskScore = Math.min(95, Math.max(45, 100 - Math.round(stock.score / 3)));

      return {
        stockCode: stock.code,
        tradeDate,
        trendScore,
        volumeScore,
        sectorScore,
        fundScore,
        riskScore,
        totalScore: stock.score,
        rating: stock.rating,
        buyTrigger: stock.buyTrigger,
        stopLoss: stock.stopLoss,
        takeProfit: stock.takeProfit,
        riskNote: stock.risk,
        reason: `${stock.sector}方向观察，综合评分 ${stock.score}`,
      };
    }),
  });

  await prisma.dailyReport.create({
    data: {
      reportDate: new Date(`${dailyReport.date}T00:00:00.000Z`),
      marketSummary: dailyReport.conclusion,
      indexPerformance: JSON.stringify(dailyReport.indexPerformance),
      hotSectors: JSON.stringify(dailyReport.sectorOrder),
      watchlist: JSON.stringify(dailyReport.watchTargets),
      previousReview: JSON.stringify(dailyReport.previousReview),
      avoidDirections: JSON.stringify(dailyReport.avoidDirections),
      riskWarning: riskDisclaimer,
    },
  });

  await prisma.tradeJournal.createMany({
    data: tradeJournal.records.map((record) => {
      const buyPrice = parseNumber(record.buyPrice);
      const sellPrice = parseNumber(record.sellPrice);
      const profitLoss = Number((sellPrice - buyPrice).toFixed(2));
      const profitLossPct = parsePercent(record.pnlPercent);

      return {
        stockCode: record.code,
        stockName: record.name,
        buyDate: new Date(`${record.buyDate}T00:00:00.000Z`),
        buyPrice,
        sellDate: new Date(`${record.sellDate}T00:00:00.000Z`),
        sellPrice,
        positionSize: parsePercent(record.position),
        stopLoss: "按计划止损线执行",
        takeProfit: "按计划止盈区间执行",
        buyReason: record.buyReason,
        sellReason: record.sellReason,
        profitLoss,
        profitLossPct,
        reviewNote: record.review,
      };
    }),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
