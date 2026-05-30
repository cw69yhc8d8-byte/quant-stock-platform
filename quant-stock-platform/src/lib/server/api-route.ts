import { NextResponse } from "next/server";

import { getConfiguredProviderName } from "@/lib/data-providers";

export function jsonOk(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      ...payload,
    },
    { status },
  );
}

export function jsonError(message: string, status = 200, extras?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      provider: getConfiguredProviderName(),
      dataSource: "mock-fallback",
      warning: message,
      error: message,
      generatedAt: new Date().toISOString(),
      ...extras,
    },
    { status },
  );
}
