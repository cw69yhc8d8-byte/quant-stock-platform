import { getStockDetail } from "@/lib/api-data";
import { jsonError, jsonOk } from "@/lib/server/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const data = await getStockDetail(code);

    if (!data.data.stock) {
      return jsonOk(data, 404);
    }

    return jsonOk(data);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "读取股票详情失败");
  }
}
