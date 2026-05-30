import { getProviderConfiguration } from "@/lib/data-providers/config";
import type { DataProvider } from "@/lib/data-providers/types";

function notImplemented(): never {
  throw new Error("Tushare provider not implemented yet");
}

export const tushareProvider: DataProvider = {
  name: "tushare",
  label: "Tushare",
  async getStatus() {
    const config = getProviderConfiguration();

    return {
      provider: "tushare",
      label: "Tushare",
      status: "not_implemented",
      available: false,
      message:
        config.warningMessage ??
        "Tushare provider not implemented yet，本阶段不会请求真实行情。",
      warning: config.warningMessage ?? config.databaseWarning ?? null,
      fallbackEnabled: true,
      configuredProvider: config.configuredProvider,
      resolvedProvider: config.resolvedProvider,
      isProduction: config.isProduction,
      databaseAvailable: config.databaseAvailable,
      databaseWarning: config.databaseWarning,
    };
  },
  async getMarketOverview() {
    return notImplemented();
  },
  async getIndexQuotes() {
    return notImplemented();
  },
  async getSectorRankings() {
    return notImplemented();
  },
  async getStockList() {
    return notImplemented();
  },
  async getStockDailyQuotes() {
    return notImplemented();
  },
  async getStockScores() {
    return notImplemented();
  },
  async getLatestReport() {
    return notImplemented();
  },
};
