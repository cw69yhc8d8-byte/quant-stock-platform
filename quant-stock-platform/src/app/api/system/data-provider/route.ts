import { getConfiguredProviderName, getRawConfiguredProviderName } from "@/lib/data-providers";
import { getDataProviderStatus } from "@/lib/data-refresh";
import { jsonError, jsonOk } from "@/lib/server/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDataProviderStatus();

    return jsonOk({
      success: true,
      dataSource: data.databaseAvailable === false ? "mock-fallback" : "database",
      warning: data.warning ?? data.databaseWarning ?? null,
      ...data,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "读取数据源状态失败",
      200,
      {
        provider: getConfiguredProviderName(),
        label: "Unknown",
        status: "error",
        available: false,
        fallbackEnabled: true,
        configuredProvider: getRawConfiguredProviderName(),
        resolvedProvider: getConfiguredProviderName(),
        latestRefresh: null,
      },
    );
  }
}
