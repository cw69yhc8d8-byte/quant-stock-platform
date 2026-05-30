export type ApiDataSource = "database" | "mock-fallback";

export type ApiEnvelope<T> = {
  success: boolean;
  provider: string;
  source: ApiDataSource;
  dataSource: ApiDataSource;
  refreshedAt: string | null;
  updatedAt: string | null;
  generatedAt: string;
  data: T;
  error: string | null;
  fallbackReason: string | null;
  warning?: string | null;
  partial?: boolean;
  meta?: Record<string, unknown>;
};

type LegacyPayload<T> = T & {
  source?: ApiDataSource;
  fallbackReason?: string;
  error?: string | null;
};

export function createApiEnvelope<T>(
  input: Omit<ApiEnvelope<T>, "dataSource" | "generatedAt"> &
    Partial<Pick<ApiEnvelope<T>, "dataSource" | "generatedAt">>,
): ApiEnvelope<T> {
  return {
    ...input,
    dataSource: input.dataSource ?? input.source,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

export function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "data" in value && "success" in value && "provider" in value;
}

export function normalizeApiPayload<T>(
  payload: unknown,
  fallbackData: T,
): ApiEnvelope<T> {
  if (isApiEnvelope<T>(payload)) {
    return payload;
  }

  const legacyPayload = (payload ?? {}) as LegacyPayload<T>;

  return {
    success: true,
    provider: "local",
    source: legacyPayload.source ?? "database",
    dataSource: legacyPayload.source ?? "database",
    refreshedAt: null,
    updatedAt: null,
    generatedAt: new Date().toISOString(),
    data: (payload as T) ?? fallbackData,
    error: legacyPayload.error ?? null,
    fallbackReason: legacyPayload.fallbackReason ?? null,
    warning: legacyPayload.fallbackReason ?? null,
  };
}
