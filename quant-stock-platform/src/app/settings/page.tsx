"use client";

import { useState } from "react";
import {
  Clock3,
  Database,
  FileText,
  Settings2,
  ShieldAlert,
  TerminalSquare,
  Wrench,
} from "lucide-react";

import { RefreshActionGroup } from "@/components/system/refresh-action-group";
import { RefreshLogList } from "@/components/system/refresh-log-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useApiResource } from "@/lib/use-api-resource";
import type { ProviderStatusPayload, RefreshLogRecord, RefreshTask } from "@/lib/system-types";

const fallbackProviderStatus: ProviderStatusPayload = {
  provider: "mock",
  label: "Mock Data",
  status: "ready",
  available: true,
  message: "当前使用本地 mock provider，不请求真实行情。",
  fallbackEnabled: true,
  configuredProvider: "mock",
  resolvedProvider: "mock",
  latestRefresh: null,
};

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "暂无";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function mapStatusText(status: string) {
  if (status === "ready") return "可用";
  if (status === "partial") return "部分成功";
  if (status === "degraded") return "依赖缺失";
  if (status === "not_implemented") return "未实现";
  if (status === "failed") return "失败";
  if (status === "success") return "成功";
  return status;
}

export default function SettingsPage() {
  const {
    data: providerStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    reload: reloadProviderStatus,
  } = useApiResource("/api/system/data-provider", fallbackProviderStatus);
  const {
    data: logsData,
    reload: reloadLogs,
  } = useApiResource<{ logs: RefreshLogRecord[] }>(
    "/api/data-refresh/logs",
    {
      logs: [],
    },
  );
  const [refreshingTask, setRefreshingTask] = useState<RefreshTask | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function handleRefresh(taskType: RefreshTask) {
    try {
      setRefreshingTask(taskType);
      setRefreshMessage(null);

      const response = await fetch("/api/system/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: string;
        message?: string;
        errorMessage?: string;
      };

      setRefreshMessage(
        payload.ok
          ? payload.message ?? `${taskType} 刷新完成`
          : payload.errorMessage ?? payload.message ?? `${taskType} 刷新失败`,
      );
      await Promise.all([reloadProviderStatus(), reloadLogs()]);
    } catch (error) {
      setRefreshMessage(
        error instanceof Error ? error.message : `${taskType} 手动刷新失败`,
      );
      await Promise.all([reloadProviderStatus(), reloadLogs()]);
    } finally {
      setRefreshingTask(null);
    }
  }

  const latest = providerStatus.latestRefresh;
  const logs = logsData.logs ?? [];
  const latestFailure = logs.find((log) => log.status === "failed") ?? null;
  const technicalDetails = [
    `configuredProvider=${providerStatus.configuredProvider ?? providerStatus.provider}`,
    `resolvedProvider=${providerStatus.resolvedProvider ?? providerStatus.provider}`,
    `python=${providerStatus.pythonCommand ?? "未检测到"}`,
    providerStatus.message,
    latestFailure?.errorMessage ?? "",
  ].filter(Boolean);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="系统设置"
        description="第五阶段把这里收敛成稳定的数据源控制台，用来检查依赖、查看刷新状态、手动拉取公开行情并验证 fallback。"
        badge="数据源控制台"
      />

      <Card className="border-cyan-400/20 bg-cyan-400/[0.03]">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <Database className="size-5 text-cyan-200" />
              <CardTitle className="mt-3">数据源状态</CardTitle>
              <CardDescription>
                DATA_PROVIDER 可切换为 mock / akshare / tushare。当前阶段只有 AkShare 支持真实公开行情。
              </CardDescription>
            </div>
            <RefreshActionGroup
              loadingTask={refreshingTask}
              onRefresh={handleRefresh}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingRow
              label="当前 DATA_PROVIDER"
              value={providerStatus.configuredProvider ?? providerStatus.provider}
            />
            <SettingRow
              label="实际使用 provider"
              value={
                <Badge variant={providerStatus.available ? "success" : "warning"}>
                  {providerStatus.label}
                </Badge>
              }
            />
            <SettingRow
              label="当前状态"
              value={mapStatusText(providerStatus.status)}
              tone={providerStatus.available ? "neutral" : "warning"}
            />
            <SettingRow
              label="最近刷新结果"
              value={latest ? mapStatusText(latest.status) : "暂无刷新记录"}
              tone={latest?.status === "failed" ? "warning" : "neutral"}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingRow
              label="Python 可用"
              value={providerStatus.pythonAvailable ? "可用" : "未检测到 / 未启用"}
              tone={providerStatus.pythonAvailable ? "neutral" : "warning"}
            />
            <SettingRow
              label="Python 命令"
              value={providerStatus.pythonCommand ?? "未找到"}
            />
            <SettingRow
              label="AkShare 依赖"
              value={providerStatus.akshareInstalled ? "已安装" : "未安装"}
              tone={providerStatus.akshareInstalled ? "neutral" : "warning"}
            />
            <SettingRow
              label="数据库状态"
              value={providerStatus.databaseAvailable === false ? "不可用 / 已回退" : "可用"}
              tone={providerStatus.databaseAvailable === false ? "warning" : "neutral"}
            />
            <SettingRow
              label="pandas 依赖"
              value={providerStatus.pandasInstalled ? "已安装" : "未安装"}
              tone={providerStatus.pandasInstalled ? "neutral" : "warning"}
            />
            <SettingRow
              label="最近刷新时间"
              value={formatTime(latest?.finishedAt ?? latest?.createdAt)}
            />
            <SettingRow
              label="最近失败摘要"
              value={latestFailure?.errorMessage ?? "暂无"}
              tone={latestFailure ? "warning" : "neutral"}
            />
            <SettingRow
              label="当前阶段"
              value="支持 AkShare，保留 mock fallback"
            />
          </div>

          <div className="rounded-md border border-border bg-background/45 p-4 text-sm leading-6 text-muted-foreground">
            {isLoadingStatus
              ? "正在读取数据源状态..."
              : statusError
                ? `状态读取失败：${statusError}`
                : providerStatus.message}
          </div>

          {refreshMessage ? (
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm leading-6 text-amber-100">
              {refreshMessage}
            </div>
          ) : null}

          {latest?.errorMessage ? (
            <div className="rounded-md border border-rose-400/20 bg-rose-400/[0.04] p-4 text-sm leading-6 text-rose-100">
              最近失败原因：{latest.errorMessage}
            </div>
          ) : null}

          {providerStatus.databaseWarning ? (
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm leading-6 text-amber-100">
              数据库提示：{providerStatus.databaseWarning}
            </div>
          ) : null}

          <details className="rounded-md border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer text-foreground">
              技术详情
            </summary>
            <ul className="mt-3 space-y-2 leading-6">
              {technicalDetails.map((detail, index) => (
                <li key={`${detail}-${index}`}>{detail}</li>
              ))}
            </ul>
          </details>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <TerminalSquare className="size-5 text-cyan-200" />
            <CardTitle>AkShare 检测</CardTitle>
            <CardDescription>
              如果 Python 或 AkShare 未安装，系统会回退到 mock fallback，不会导致页面白屏。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow
              label="Python 版本"
              value={providerStatus.pythonVersion ?? "未知"}
            />
            <SettingRow
              label="pandas 依赖"
              value={providerStatus.pandasInstalled ? "已安装" : "未安装"}
              tone={providerStatus.pandasInstalled ? "neutral" : "warning"}
            />
            <SettingRow
              label="fallback"
              value={providerStatus.fallbackEnabled ? "已启用" : "未启用"}
            />
            <div className="rounded-md border border-border bg-secondary/35 p-4 text-sm leading-6 text-muted-foreground">
              切换到 <code>DATA_PROVIDER=&quot;akshare&quot;</code> 后，先安装 Python 依赖，再点击上方对应刷新按钮。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Clock3 className="size-5 text-cyan-200" />
            <CardTitle>刷新日志</CardTitle>
          <CardDescription>最近 20 条刷新记录，成功、失败和部分成功都会保留。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RefreshLogList logs={logs} />
        </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Settings2 className="size-5 text-cyan-200" />
            <CardTitle>风控参数设置</CardTitle>
            <CardDescription>
              控件为静态占位，用于确认后续风控配置结构。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ReadonlyField label="单票最大仓位" value="15%" />
            <ReadonlyField label="默认止损比例" value="5%" />
            <ReadonlyField label="默认止盈比例" value="12%" />
            <ReadonlyField label="最大持仓数量" value="6 只" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="size-5 text-cyan-200" />
            <CardTitle>报告设置</CardTitle>
            <CardDescription>日报与 PDF 功能仍以产品原型为主。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow label="是否生成每日投研报告" checked />
            <ToggleRow label="是否开启 PDF 导出" checked={false} />
          </CardContent>
        </Card>

        <Card className="border-amber-400/25 bg-amber-400/[0.04]">
          <CardHeader>
            <ShieldAlert className="size-5 text-amber-200" />
            <CardTitle>风险提示设置</CardTitle>
            <CardDescription>
              风险提示必须显示，默认开启，不允许关闭。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow label="是否显示风险提示" checked locked />
            <div className="rounded-md border border-amber-400/15 bg-background/50 p-3 text-sm leading-6 text-muted-foreground">
              本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Wrench className="size-5 text-cyan-200" />
            <CardTitle>系统说明</CardTitle>
            <CardDescription>
              当前版本已支持 AkShare 公开行情接入，但不做自动交易、不做实盘下单、不做收益承诺。
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-md border border-border bg-secondary/35 p-4 text-sm leading-6 text-muted-foreground">
            下一阶段更适合做板块映射、历史日线落库、真实报告生成和更稳定的评分模型。
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SettingRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary/35 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={
          tone === "warning"
            ? "text-right text-sm font-medium text-amber-200"
            : "text-right text-sm font-medium text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        readOnly
        className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none"
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  locked = false,
}: {
  label: string;
  checked: boolean;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary/35 p-4">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {locked ? (
          <div className="mt-1 text-xs text-amber-200">强制开启，不可关闭</div>
        ) : null}
      </div>
      <div
        className={
          checked
            ? "flex h-6 w-11 items-center justify-end rounded-full bg-cyan-300 p-1"
            : "flex h-6 w-11 items-center justify-start rounded-full bg-muted p-1"
        }
      >
        <span className="size-4 rounded-full bg-background" />
      </div>
    </div>
  );
}
