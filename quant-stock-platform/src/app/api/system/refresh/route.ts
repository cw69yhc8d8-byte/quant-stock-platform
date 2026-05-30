import { refreshData } from "@/lib/data-refresh";
import { jsonError, jsonOk } from "@/lib/server/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let taskType: unknown = "all";

  try {
    const body = await request.json();
    taskType = body?.taskType ?? "all";
  } catch {
    taskType = "all";
  }

  try {
    const result = await refreshData(taskType);

    return jsonOk({
      dataSource: "dataSource" in result ? result.dataSource : "database",
      warning: "warning" in result ? result.warning : null,
      ...result,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "刷新失败");
  }
}
