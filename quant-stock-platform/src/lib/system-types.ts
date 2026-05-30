export type RefreshLogRecord = {
  id: number;
  provider: string;
  taskType: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs?: number | null;
  message: string;
  errorMessage: string | null;
  createdAt: string | null;
};

export type ProviderStatusPayload = {
  provider: string;
  label: string;
  status: string;
  available: boolean;
  message: string;
  warning?: string | null;
  fallbackEnabled?: boolean;
  configuredProvider?: string | null;
  resolvedProvider?: string | null;
  isProduction?: boolean;
  databaseAvailable?: boolean;
  databaseWarning?: string | null;
  pythonAvailable?: boolean;
  pythonCommand?: string | null;
  pythonVersion?: string | null;
  akshareInstalled?: boolean;
  pandasInstalled?: boolean;
  latestRefresh: RefreshLogRecord | null;
};

export type RefreshTask = "market" | "sectors" | "stocks" | "all";
