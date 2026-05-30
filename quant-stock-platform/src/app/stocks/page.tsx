"use client";

import { Database, Filter, SlidersHorizontal } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
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
import type { StocksOverviewData } from "@/lib/api-data";
import type { ProviderStatusPayload } from "@/lib/system-types";
import { useApiResource } from "@/lib/use-api-resource";
import {
  sectorRankings,
  stockWatchlist as fallbackStockWatchlist,
} from "@/lib/mock-data";
import type { StockWatchItem } from "@/lib/types";

const stockColumns: DataTableColumn<StockWatchItem>[] = [
  { key: "code", header: "股票代码", className: "font-mono text-cyan-200" },
  { key: "name", header: "股票名称", className: "text-foreground" },
  { key: "sector", header: "所属板块" },
  { key: "latestPrice", header: "最新价", align: "right" },
  {
    key: "changePercent",
    header: "涨跌幅",
    align: "right",
    render: (row) => (
      <span className={row.changePercent.startsWith("-") ? "text-rose-300" : "text-emerald-300"}>
        {row.changePercent}
      </span>
    ),
  },
  {
    key: "score",
    header: "综合评分",
    align: "right",
    render: (row) => <span className="font-semibold text-foreground">{row.score}</span>,
  },
  {
    key: "rating",
    header: "评级",
    render: (row) => (
      <Badge
        variant={
          row.rating === "强观察"
            ? "success"
            : row.rating === "谨慎观察"
              ? "warning"
              : "secondary"
        }
      >
        {row.rating}
      </Badge>
    ),
  },
  { key: "buyTrigger", header: "买入触发条件" },
  { key: "stopLoss", header: "止损线", className: "text-rose-200" },
  { key: "takeProfit", header: "止盈区间", className: "text-emerald-200" },
  { key: "risk", header: "风险提示", className: "text-amber-200" },
];

const fallbackStocksData: StocksOverviewData = {
  stockWatchlist: fallbackStockWatchlist,
};

const fallbackProviderData: ProviderStatusPayload = {
  provider: "mock",
  label: "Mock Data",
  status: "ready",
  available: true,
  message: "当前使用本地 mock provider，不请求真实行情。",
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

export default function StocksPage() {
  const resource = useApiResource("/api/stocks", fallbackStocksData);
  const providerResource = useApiResource("/api/system/data-provider", fallbackProviderData);
  const stockWatchlist = resource.data.stockWatchlist;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Stocks"
        title="股票池"
        description="股票池页现在会显示当前数据源、最近刷新时间，并明确标注评分模型版本与 fallback 状态。"
        badge="评分模型 v0.1"
      />

      <DataStatus
        isLoading={resource.isLoading}
        usingFallback={resource.usingFallback}
        error={resource.error}
        fallbackReason={resource.fallbackReason}
        provider={resource.provider ?? providerResource.data.provider}
        refreshedAt={resource.refreshedAt}
        isEmpty={stockWatchlist.length === 0}
        emptyLabel="当前没有股票池数据。"
        technicalDetails={[
          providerResource.data.message,
          resource.fallbackReason ?? "",
          resource.error ?? "",
        ].filter(Boolean)}
      />

      <Card className="border-cyan-400/20 bg-cyan-400/[0.03]">
        <CardHeader>
          <Database className="size-5 text-cyan-200" />
          <CardTitle>股票池数据源</CardTitle>
          <CardDescription>
            当前页面使用 v0.1 简易行情评分模型：基于涨跌幅、成交额、活跃度和风险扣分生成观察评级。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <InfoCard
            label="当前显示来源"
            value={resource.usingFallback ? "Mock Fallback" : `AkShare / ${resource.provider ?? "database"}`}
          />
          <InfoCard label="最近刷新时间" value={formatTime(resource.refreshedAt)} />
          <InfoCard label="数据更新时间" value={formatTime(resource.updatedAt)} />
          <InfoCard label="评分模型版本" value="v0.1 简易行情评分模型" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-5 text-cyan-200" />
            <CardTitle>筛选区</CardTitle>
          </div>
          <CardDescription>
            先保留专业投研界面的筛选结构，后续再接真实筛选逻辑。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Field label="按板块筛选">
            <select className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none">
              <option>全部板块</option>
              {sectorRankings.map((sector, index) => (
                <option key={`${sector.name}-${sector.rank}-${index}`}>{sector.name}</option>
              ))}
            </select>
          </Field>
          <Field label="按评级筛选">
            <select className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none">
              <option>全部评级</option>
              <option>强观察</option>
              <option>谨慎观察</option>
              <option>暂不关注</option>
            </select>
          </Field>
          <Field label="按评分排序">
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-foreground">
              <SlidersHorizontal className="size-4" />
              综合评分从高到低
            </button>
          </Field>
        </CardContent>
      </Card>

      <DataTable
        title="量化观察股票表格"
        badge={resource.usingFallback ? "mock fallback" : "AkShare / SQLite"}
        columns={stockColumns}
        data={stockWatchlist}
        minWidth={1280}
        getRowKey={(row, index) => `${row.code}-${row.rating}-${index}`}
      />
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/35 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
