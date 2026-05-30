import { createJournalRecord, getJournal } from "@/lib/api-data";
import { getConfiguredProviderName } from "@/lib/data-providers";
import { getDatabaseFallbackWarning, isDatabaseReady } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/server/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getJournal();

    return jsonOk(data);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "读取交易复盘失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await createJournalRecord(body);

    return jsonOk(
      {
        success: true,
        provider: getConfiguredProviderName(),
        source: "database",
        dataSource: "database",
        warning: null,
        record,
      },
      201,
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "新增交易复盘失败",
      isDatabaseReady() ? 400 : 503,
      {
        warning: isDatabaseReady() ? null : getDatabaseFallbackWarning(),
      },
    );
  }
}
