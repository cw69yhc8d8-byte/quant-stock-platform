import { akshareProvider } from "@/lib/data-providers/akshare-provider";
import { getConfiguredProviderName } from "@/lib/data-providers/config";
import { mockProvider } from "@/lib/data-providers/mock-provider";
import { tushareProvider } from "@/lib/data-providers/tushare-provider";
import type { DataProvider } from "@/lib/data-providers/types";

export * from "@/lib/data-providers/config";

export function getCurrentDataProvider(): DataProvider {
  const provider = getConfiguredProviderName();

  if (provider === "akshare") {
    return akshareProvider;
  }

  if (provider === "tushare") {
    return tushareProvider;
  }

  return mockProvider;
}
