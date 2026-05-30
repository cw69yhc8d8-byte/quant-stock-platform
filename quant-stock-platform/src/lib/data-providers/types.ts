import type {
  DailyReport,
  IndexDatum,
  MarketOverview,
  SectorRanking,
} from "@/lib/types";

export type DataProviderName = "mock" | "akshare" | "tushare";

export type RefreshTaskType = "market" | "sectors" | "stocks" | "report" | "all";

export type ProviderStatus = {
  provider: DataProviderName;
  label: string;
  status: "ready" | "not_implemented" | "error" | "degraded";
  available: boolean;
  message: string;
  warning?: string | null;
  fallbackEnabled?: boolean;
  configuredProvider?: string | null;
  resolvedProvider?: DataProviderName;
  isProduction?: boolean;
  databaseAvailable?: boolean;
  databaseWarning?: string | null;
  pythonAvailable?: boolean;
  pythonCommand?: string | null;
  pythonVersion?: string | null;
  akshareInstalled?: boolean;
  pandasInstalled?: boolean;
};

export type ProviderStock = {
  code: string;
  name: string;
  market: string;
  sector: string;
  industry: string;
  isST: boolean;
};

export type ProviderDailyQuote = {
  stockCode: string;
  tradeDate: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  pctChange: number;
  turnoverRate: number;
};

export type ProviderIndexQuote = {
  code: string;
  name: string;
  market: string;
  tradeDate: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  amount: number;
  pctChange: number;
  changePoints: number;
};

export type ProviderMarketSnapshot = {
  tradeDate: Date;
  partial: boolean;
  message: string;
  indices: ProviderIndexQuote[];
  breadth: {
    rising: number;
    falling: number;
    unchanged: number;
    limitUp: number;
    limitDown: number;
  };
  turnover: {
    total: number;
    sh: number;
    sz: number;
    changePercent?: number | null;
  };
  sentiment: {
    score: number;
    label: string;
    description: string;
  };
  riskLevel: string;
};

export type ProviderStockScore = {
  stockCode: string;
  tradeDate: Date;
  trendScore: number;
  volumeScore: number;
  sectorScore: number;
  fundScore: number;
  riskScore: number;
  totalScore: number;
  rating: string;
  buyTrigger: string;
  stopLoss: string;
  takeProfit: string;
  riskNote: string;
  reason: string;
};

export type DataProvider = {
  name: DataProviderName;
  label: string;
  getStatus(): Promise<ProviderStatus>;
  getMarketSnapshot?(): Promise<ProviderMarketSnapshot>;
  getMarketOverview(): Promise<MarketOverview>;
  getIndexQuotes(): Promise<IndexDatum[]>;
  getSectorRankings(): Promise<SectorRanking[]>;
  getStockList(): Promise<ProviderStock[]>;
  getStockDailyQuotes(stockCode: string): Promise<ProviderDailyQuote[]>;
  getStockScores(): Promise<ProviderStockScore[]>;
  getLatestReport(): Promise<DailyReport>;
};
