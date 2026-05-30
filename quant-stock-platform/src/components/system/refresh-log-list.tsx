import { Badge } from "@/components/ui/badge";
import type { RefreshLogRecord } from "@/lib/system-types";

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "暂无";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function formatDuration(durationMs: number | null | undefined) {
  if (typeof durationMs !== "number") {
    return "—";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function mapStatusText(status: string) {
  if (status === "ready") return "可用";
  if (status === "partial") return "部分成功";
  if (status === "degraded") return "依赖缺失";
  if (status === "not_implemented") return "未实现";
  if (status === "failed") return "失败";
  if (status === "success") return "成功";
  if (status === "running") return "执行中";
  return status;
}

function mapBadgeVariant(status: string) {
  if (status === "ready" || status === "success") return "success";
  if (status === "failed" || status === "error") return "danger";
  return "warning";
}

export function RefreshLogList({
  logs,
  emptyLabel = "暂无刷新日志。",
}: {
  logs: RefreshLogRecord[];
  emptyLabel?: string;
}) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div
          key={`${log.provider}-${log.taskType}-${log.startedAt ?? log.createdAt ?? log.id}-${index}`}
          className="rounded-md border border-border bg-secondary/35 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={mapBadgeVariant(log.status)}>
                {mapStatusText(log.status)}
              </Badge>
              <span className="text-sm font-medium text-foreground">
                {log.provider} / {log.taskType}
              </span>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{formatTime(log.finishedAt ?? log.createdAt)}</div>
              <div>耗时：{formatDuration(log.durationMs)}</div>
            </div>
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {log.errorMessage ?? log.message}
          </div>
        </div>
      ))}
    </div>
  );
}
