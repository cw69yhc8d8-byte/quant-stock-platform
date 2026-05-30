"use client";

import { CalendarDays, Database, FileText, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataStatus } from "@/components/ui/data-status";
import { PageHeader } from "@/components/ui/page-header";
import { useApiResource } from "@/lib/use-api-resource";
import { dailyReport as fallbackDailyReport } from "@/lib/mock-data";
import type { DailyReport } from "@/lib/types";

const fallbackReportData: { dailyReport: DailyReport } = {
  dailyReport: fallbackDailyReport,
};

type RefreshLog = {
  finishedAt: string | null;
  createdAt: string | null;
  status: string;
};

type ProviderStatus = {
  provider: string;
  label: string;
  status: string;
  available: boolean;
  message: string;
  latestRefresh: RefreshLog | null;
};

const fallbackProviderData: ProviderStatus = {
  provider: "mock",
  label: "Mock Data",
  status: "ready",
  available: true,
  message: "当前使用本地 mock provider，不请求真实行情。",
  latestRefresh: null,
};

function formatTime(value: string | null | undefined) {
  if (!value) return "暂无刷新记录";

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

export default function ReportPage() {
  const { data, isLoading, error, usingFallback, source } = useApiResource(
    "/api/report/latest",
    fallbackReportData,
  );
  const {
    data: providerData,
    isLoading: isProviderLoading,
    error: providerError,
  } = useApiResource("/api/system/data-provider", fallbackProviderData);
  const { dailyReport } = data;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Report"
        title="每日投研报告"
        description="模拟投研日报结构，覆盖市场结论、板块排序、观察标的和复盘区域。"
        badge="日报静态版"
      />
      <DataStatus
        isLoading={isLoading}
        usingFallback={usingFallback}
        error={error}
      />

      <Card className="border-cyan-400/20 bg-cyan-400/[0.03]">
        <CardHeader>
          <Database className="size-5 text-cyan-200" />
          <CardTitle>报告数据来源</CardTitle>
          <CardDescription>
            当前报告优先读取本地 API。后续可将 provider 切换为 AkShare / Tushare。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <InfoBlock
            label="报告读取来源"
            value={source === "database" ? "本地 SQLite API" : "mock fallback"}
          />
          <InfoBlock
            label="当前 Provider"
            value={
              isProviderLoading
                ? "读取中"
                : `${providerData.label} (${providerData.provider})`
            }
          />
          <InfoBlock
            label="最近刷新时间"
            value={formatTime(
              providerData.latestRefresh?.finishedAt ??
                providerData.latestRefresh?.createdAt,
            )}
          />
          <InfoBlock
            label="mock provider"
            value={
              providerData.provider === "mock"
                ? "是，当前阶段不请求真实行情"
                : providerData.message
            }
            tone={providerData.provider === "mock" ? "warning" : "neutral"}
          />
          {providerError ? (
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm leading-6 text-amber-100 md:col-span-4">
              数据源状态读取失败：{providerError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              报告日期：{dailyReport.date}
            </div>
            <CardTitle className="mt-3 text-lg">今日市场结论</CardTitle>
            <CardDescription className="mt-2 max-w-4xl text-sm leading-6">
              {dailyReport.conclusion}
            </CardDescription>
          </div>
          <Button variant="outline" disabled>
            <Printer className="size-4" />
            生成 PDF
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <ReportSection title="指数表现" icon={<FileText className="size-5 text-cyan-200" />}>
          <BulletList items={dailyReport.indexPerformance} />
        </ReportSection>

        <ReportSection title="热点板块排序">
          <div className="flex flex-wrap gap-2">
            {dailyReport.sectorOrder.map((sector, index) => (
              <Badge key={`${sector}-${index}`} variant={index < 2 ? "success" : "secondary"}>
                {index + 1}. {sector}
              </Badge>
            ))}
          </div>
        </ReportSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {dailyReport.watchTargets.map((stock, index) => (
          <Card key={`${stock.code}-${stock.name}-${index}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>
                    {stock.name}
                    <span className="ml-2 font-mono text-sm text-cyan-200">
                      {stock.code}
                    </span>
                  </CardTitle>
                  <CardDescription>今日观察标的</CardDescription>
                </div>
                <Badge variant="warning">仅研究观察</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <InfoBlock label="观察理由" value={stock.reason} />
              <InfoBlock label="买入触发条件" value={stock.buyTrigger} />
              <InfoBlock label="止损条件" value={stock.stopLoss} />
              <InfoBlock label="止盈条件" value={stock.takeProfit} />
              <InfoBlock label="仓位建议" value={stock.positionAdvice} />
              <InfoBlock label="风险点" value={stock.risks} tone="warning" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="上一期标的复盘">
          <BulletList items={dailyReport.previousReview} />
        </ReportSection>
        <ReportSection title="今日不碰方向">
          <BulletList items={dailyReport.avoidDirections} tone="danger" />
        </ReportSection>
      </div>
    </section>
  );
}

function ReportSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BulletList({
  items,
  tone = "neutral",
}: {
  items: string[];
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className={
            tone === "danger"
              ? "rounded-md border border-rose-400/20 bg-rose-400/[0.04] p-3 text-sm leading-6 text-rose-100"
              : "rounded-md border border-border bg-secondary/35 p-3 text-sm leading-6 text-muted-foreground"
          }
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/35 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          tone === "warning"
            ? "mt-2 text-sm leading-6 text-amber-200"
            : "mt-2 text-sm leading-6 text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}
