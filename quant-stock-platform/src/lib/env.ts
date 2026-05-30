import type { DataProviderName } from "@/lib/data-providers/types";

const validProviders = new Set<DataProviderName>(["mock", "akshare", "tushare"]);

export type RuntimeEnvironment = {
  isProduction: boolean;
  isVercel: boolean;
  nodeEnv: string;
  vercelEnv: string | null;
  rawDataProvider: string | null;
  resolvedDataProvider: DataProviderName;
  providerWarning: string | null;
  databaseUrl: string | null;
  databaseAvailable: boolean;
  databaseWarning: string | null;
};

function normalizeProviderName(value: string | null): DataProviderName | null {
  const normalized = value?.trim().toLowerCase() ?? null;

  if (!normalized || !validProviders.has(normalized as DataProviderName)) {
    return null;
  }

  return normalized as DataProviderName;
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const isProduction = nodeEnv === "production" || vercelEnv === "production";
  const isVercel = Boolean(process.env.VERCEL);
  const rawDataProvider = process.env.DATA_PROVIDER?.trim() ?? null;
  const normalizedProvider = normalizeProviderName(rawDataProvider);
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? null;

  let resolvedDataProvider: DataProviderName = "mock";
  let providerWarning: string | null = null;

  if (!rawDataProvider || rawDataProvider === "") {
    resolvedDataProvider = "mock";
  } else if (!normalizedProvider) {
    resolvedDataProvider = "mock";
    providerWarning = `DATA_PROVIDER=${rawDataProvider} 无效，系统已自动回退到 mock。`;
  } else if (isProduction && normalizedProvider !== "mock") {
    resolvedDataProvider = "mock";
    providerWarning =
      "AkShare is disabled in production deployment. Using mock fallback.";
  } else {
    resolvedDataProvider = normalizedProvider;
  }

  let databaseAvailable = true;
  let databaseWarning: string | null = null;

  if (isProduction) {
    if (!databaseUrl) {
      databaseAvailable = false;
      databaseWarning = "Database unavailable, using mock fallback";
    } else if (databaseUrl.startsWith("file:")) {
      databaseAvailable = false;
      databaseWarning =
        "Local SQLite is disabled in production deployment. Using mock fallback.";
    }
  } else if (!databaseUrl) {
    databaseWarning = 'DATABASE_URL 未设置，开发环境将默认使用 "file:./dev.db"。';
  }

  return {
    isProduction,
    isVercel,
    nodeEnv,
    vercelEnv,
    rawDataProvider,
    resolvedDataProvider,
    providerWarning,
    databaseUrl,
    databaseAvailable,
    databaseWarning,
  };
}

export function getEffectiveDatabaseUrl() {
  const runtime = getRuntimeEnvironment();

  if (!runtime.databaseAvailable) {
    return null;
  }

  return runtime.databaseUrl ?? "file:./dev.db";
}
