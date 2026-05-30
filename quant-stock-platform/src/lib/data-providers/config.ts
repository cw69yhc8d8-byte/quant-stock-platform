import type { DataProviderName } from "@/lib/data-providers/types";
import { getRuntimeEnvironment } from "@/lib/env";

export function getRawConfiguredProviderName() {
  return getRuntimeEnvironment().rawDataProvider;
}

export function getConfiguredProviderName(): DataProviderName {
  return getRuntimeEnvironment().resolvedDataProvider;
}

export function getProviderConfiguration() {
  const runtime = getRuntimeEnvironment();
  const configuredProvider = runtime.rawDataProvider;
  const resolvedProvider = runtime.resolvedDataProvider;
  const isValid = runtime.providerWarning === null;

  return {
    configuredProvider,
    resolvedProvider,
    isValid,
    warningMessage: runtime.providerWarning,
    isProduction: runtime.isProduction,
    databaseAvailable: runtime.databaseAvailable,
    databaseWarning: runtime.databaseWarning,
  };
}
