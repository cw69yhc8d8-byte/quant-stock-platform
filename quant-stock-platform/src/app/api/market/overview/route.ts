import { getMarketOverview } from "@/lib/api-data";
import { jsonError, jsonOk } from "@/lib/server/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMarketOverview();

    return jsonOk(data);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "读取市场概览失败",
    );
  }
}
