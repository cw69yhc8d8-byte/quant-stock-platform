"use client";

import { useCallback, useEffect, useState } from "react";

import { normalizeApiPayload, type ApiEnvelope } from "@/lib/api-response";

export function useApiResource<T>(endpoint: string, fallbackData: T) {
  const [data, setData] = useState<T>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [source, setSource] = useState<"database" | "mock-fallback">(
    "mock-fallback",
  );
  const [provider, setProvider] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<ApiEnvelope<T> | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(endpoint, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          throw new Error(`接口返回 ${response.status}`);
        }

        const payload = normalizeApiPayload<T>(await response.json(), fallbackData);

        setEnvelope(payload);
        setData(payload.data);
        setSource(payload.source);
        setProvider(payload.provider);
        setUpdatedAt(payload.updatedAt);
        setRefreshedAt(payload.refreshedAt);
        setFallbackReason(payload.fallbackReason);
        setError(payload.error ?? payload.fallbackReason ?? null);
      } catch (requestError) {
        if (signal?.aborted) {
          return;
        }

        setEnvelope(null);
        setData(fallbackData);
        setSource("mock-fallback");
        setProvider(null);
        setUpdatedAt(null);
        setRefreshedAt(null);
        setFallbackReason("接口请求失败，已使用 mock fallback");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "接口请求失败，已使用 mock fallback",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [endpoint, fallbackData],
  );

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      void load(controller.signal);
    });

    return () => {
      controller.abort();
    };
  }, [load]);

  return {
    data,
    envelope,
    isLoading,
    error,
    fallbackReason,
    source,
    provider,
    updatedAt,
    refreshedAt,
    usingFallback: source === "mock-fallback",
    reload: async () => {
      await load();
    },
  };
}
