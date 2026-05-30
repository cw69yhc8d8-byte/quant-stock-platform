export type Trend = "up" | "down" | "flat";

export type RiskLevel = "低" | "中" | "高";

export type IndexDatum = {
  name: string;
  code: string;
  value: string;
  changePercent: string;
  changePoints: string;
  trend: Trend;
  series: { time: string; value: number }[];
};

export type MarketOverview = {
  breadth: {
    rising: number;
    falling: number;
    unchanged: number;
    limitUp: number;
    limitDown: number;
  };
  turnover: {
    total: string;
    sh: string;
    sz: string;
    change: string;
  };
  sentiment: {
    score: number;
    label: string;
    description: string;
  };
  riskLevel: string;
};

export type MarketMover = {
  code: string;
  name: string;
  sector: string;
  price: string;
  changePercent: string;
  turnover: string;
  reason: string;
};

export type SectorRanking = {
  rank: number;
  name: string;
  changePercent: string;
  turnover: string;
  heat: number;
  limitUp: number;
  leader: string;
  riskLevel: RiskLevel;
  focus: "适合关注" | "谨慎观察" | "暂不关注";
  rotation: string;
};

export type StockRating = "强观察" | "谨慎观察" | "暂不关注";

export type StockWatchItem = {
  code: string;
  name: string;
  sector: string;
  latestPrice: string;
  changePercent: string;
  score: number;
  rating: StockRating;
  buyTrigger: string;
  stopLoss: string;
  takeProfit: string;
  risk: string;
};

export type BacktestTrade = {
  date: string;
  code: string;
  name: string;
  action: "买入" | "卖出";
  price: string;
  position: string;
  pnl: string;
  note: string;
};

export type BacktestResult = {
  strategyName: string;
  range: string;
  universe: string;
  rules: string[];
  metrics: {
    totalReturn: string;
    maxDrawdown: string;
    winRate: string;
    profitLossRatio: string;
    tradeCount: number;
    averageHoldingDays: string;
  };
  equityCurve: { date: string; value: number }[];
  trades: BacktestTrade[];
};

export type TradeJournalRecord = {
  code: string;
  name: string;
  buyDate: string;
  buyPrice: string;
  sellDate: string;
  sellPrice: string;
  position: string;
  pnlPercent: string;
  buyReason: string;
  sellReason: string;
  review: string;
};

export type TradeJournal = {
  stats: {
    totalTrades: number;
    winRate: string;
    totalReturn: string;
    maxDrawdown: string;
    currentPositions: number;
  };
  pnlCurve: { date: string; value: number }[];
  records: TradeJournalRecord[];
};

export type DailyReportStock = {
  code: string;
  name: string;
  reason: string;
  buyTrigger: string;
  stopLoss: string;
  takeProfit: string;
  positionAdvice: string;
  risks: string;
};

export type DailyReport = {
  date: string;
  conclusion: string;
  indexPerformance: string[];
  sectorOrder: string[];
  watchTargets: DailyReportStock[];
  previousReview: string[];
  avoidDirections: string[];
};
