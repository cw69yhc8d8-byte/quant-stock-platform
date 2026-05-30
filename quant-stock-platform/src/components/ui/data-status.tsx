import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

type DataStatusProps = {
  isLoading: boolean;
  usingFallback: boolean;
  error: string | null;
  fallbackReason?: string | null;
  provider?: string | null;
  refreshedAt?: string | null;
  isEmpty?: boolean;
  emptyLabel?: string;
  technicalDetails?: string[];
};

export function DataStatus({
  isLoading,
  usingFallback,
  error,
  fallbackReason,
  provider,
  refreshedAt,
  isEmpty = false,
  emptyLabel = "当前暂无可展示数据。",
  technicalDetails = [],
}: DataStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/35 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-cyan-200" />
        正在读取最新接口数据，页面会继续保持稳定显示。
      </div>
    );
  }

  if (usingFallback || error) {
    return (
      <div className="space-y-3 rounded-md border border-amber-400/25 bg-amber-400/[0.04] px-3 py-3 text-xs text-amber-100">
        <div className="flex flex-wrap items-center gap-2">
          <AlertCircle className="size-4" />
          <span>已启用 mock fallback</span>
          <Badge variant="warning">{provider ?? "fallback"}</Badge>
          {refreshedAt ? (
            <span className="text-muted-foreground">
              最近刷新：{new Date(refreshedAt).toLocaleString("zh-CN", { hour12: false })}
            </span>
          ) : null}
        </div>
        <div className="text-muted-foreground">
          {fallbackReason ?? error ?? "接口异常，已自动回退到内置 mock 数据。"}
        </div>
        {technicalDetails.length > 0 ? (
          <details className="rounded-md border border-amber-400/10 bg-background/35 px-3 py-2 text-muted-foreground">
            <summary className="cursor-pointer text-xs text-amber-100">
              技术详情
            </summary>
            <ul className="mt-2 space-y-1">
              {technicalDetails.map((detail, index) => (
                <li key={`${detail}-${index}`}>{detail}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/35 px-3 py-2 text-xs text-muted-foreground">
        <TriangleAlert className="size-4 text-amber-200" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2 text-xs text-emerald-100">
      <CheckCircle2 className="size-4" />
      <span>接口返回正常</span>
      <Badge variant="success">database</Badge>
      {provider ? (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Database className="size-3.5" />
          {provider}
        </span>
      ) : null}
      {refreshedAt ? (
        <span className="text-muted-foreground">
          最近刷新：{new Date(refreshedAt).toLocaleString("zh-CN", { hour12: false })}
        </span>
      ) : null}
    </div>
  );
}
