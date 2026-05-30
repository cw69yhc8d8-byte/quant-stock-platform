import { getRefreshLogs } from "@/lib/data-refresh";
import { getDatabaseFallbackWarning, isDatabaseReady } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/server/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await getRefreshLogs(20);

    return jsonOk({
      success: true,
      dataSource: isDatabaseReady() ? "database" : "mock-fallback",
      warning: isDatabaseReady() ? null : getDatabaseFallbackWarning(),
      logs,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "读取刷新日志失败",
      200,
      {
        logs: [],
      },
    );
  }
}
