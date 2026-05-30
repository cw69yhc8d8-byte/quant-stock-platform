"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  Flame,
  Gauge,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { LineChartCard } from "@/components/charts/line-chart-card";
import { RefreshActionGroup } from "@/components/system/refresh-action-group";
import { RefreshLogList } from "@/components/system/refresh-log-list";
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
import { StatCard } from "@/components/ui/stat-card";
import type {
  MarketOverviewData,
  SectorOverviewData,
  StocksOverviewData,
} from "@/lib/api-data";
import type { ProviderStatusPayload, RefreshLogRecord, RefreshTask } from "@/lib/system-types";
import { useApiResource } from "@/lib/use-api-resource";
import {
  indexData as fallbackIndexData,
  marketMovers as fallbackMarketMovers,
  marketOverview as fallbackMarketOverview,
  sectorRankings as fallbackSectorRankings,
  stockWatchlist as fallbackStockWatchlist,
} from "@/lib/mock-data";
import type { MarketMover, SectorRanking, StockWatchItem } from "@/lib/types";

const moverColumns: DataTableColumn<MarketMover>[] = [
  { key: "code", header: "代码", className: "font-mono text-cyan-200" },
  { key: "name", header: "名称", className: "text-foreground" },
  { key: "sector", header: "板块" },
  { key: "price", header: "最新价", align: "right" },
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
  { key: "turnover", header: "成交额", align: "right" },
  { key: "reason", header: "异动说明" },
];

const sectorColumns: DataTableColumn<SectorRanking>[] = [
  { key: "name", header: "板块名称", className: "text-foreground" },
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
  { key: "turnover", header: "成交额", align: "right" },
  { key: "heat", header: "热度", align: "right" },
  { key: "leader", header: "龙头股" },
  { key: "focus", header: "关注建议" },
];

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
  { key: "score", header: "评分", align: "right" },
  { key: "rating", header: "评级" },
];

const fallbackMarketData: MarketOverviewData = {
  indexData: fallbackIndexData,
  marketOverview: fallbackMarketOverview,
  marketMovers: fallbackMarketMovers,
  intradayMarketFlow: [],
};

const fallbackSectorData: SectorOverviewData = {
  sectorRankings: fallbackSectorRankings,
};

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

function buildIndexTrendData(items: MarketOverviewData["indexData"]) {
  if (items.length < 3 || items.some((item) => item.series.length === 0)) {
    return [];
  }

  return items[0].series.map((point, index) => ({
    time: point.time,
    sh: Number((((items[0].series[index].value - items[0].series[0].value) / items[0].series[0].value) * 100).toFixed(2)),
    sz: Number((((items[1].series[index].value - items[1].series[0].value) / items[1].series[0].value) * 100).toFixed(2)),
    cyb: Number((((items[2].series[index].value - items[2].series[0].value) / items[2].series[0].value) * 100).toFixed(2)),
  }));
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "暂无";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function mapProviderState(status: ProviderStatusPayload) {
  return [
    {
      label: "当前数据源",
      value: status.configuredProvider ?? status.provider,
    },
    {
      label: "Python 状态",
      value: status.pythonAvailable ? "可用" : "不可用",
    },
    {
      label: "AkShare 状态",
      value: status.akshareInstalled ? "已安装" : "未安装 / 不可用",
    },
    {
      label: "pandas 状态",
      value: status.pandasInstalled ? "已安装" : "未安装",
    },
    {
      label: "最近刷新时间",
      value: formatTime(status.latestRefresh?.finishedAt ?? status.latestRefresh?.createdAt),
    },
    {
      label: "当前刷新状态",
      value: status.latestRefresh?.status ?? status.status,
    },
  ];
}

export default function MarketPage() {
  const marketResource = useApiResource("/api/market/overview", fallbackMarketData);
  const sectorsResource = useApiResource("/api/sectors", fallbackSectorData);
  const stocksResource = useApiResource("/api/stocks", fallbackStocksData);
  const providerResource = useApiResource("/api/system/data-provider", fallbackProviderData);
  const logsResource = useApiResource<{ logs: RefreshLogRecord[] }>("/api/data-refresh/logs", {
    logs: [],
  });
  const [refreshingTask, setRefreshingTask] = useState<RefreshTask | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const { data: marketData, isLoading, error, usingFallback, provider, refreshedAt, fallbackReason } = marketResource;
  const providerStatus = providerResource.data;
  const logs = logsResource.data.logs ?? [];
  const indexTrendData = buildIndexTrendData(marketData.indexData);
  const providerCards = mapProviderState(providerStatus);
  const technicalDetails = [
    fallbackReason ?? "",
    error ?? "",
    providerStatus.message,
    logs[0]?.errorMessage ?? "",
  ].filter(Boolean);

  const topSectorRows = useMemo(() => sectorsResource.data.sectorRankings.slice(0, 8), [sectorsResource.data.sectorRankings]);
  const topStockRows = useMemo(() => stocksResource.data.stockWatchlist.slice(0, 10), [stocksResource.data.stockWatchlist]);

  async function reloadAll() {
    await Promise.all([
      marketResource.reload(),
      sectorsResource.reload(),
      stocksResource.reload(),
      providerResource.reload(),
      logsResource.reload(),
    ]);
  }

  async function handleRefresh(task: RefreshTask) {
    try {
      setRefreshingTask(task);
      setRefreshMessage(null);

      const response = await fetch("/api/system/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: task }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        errorMessage?: string;
      };

      setRefreshMessage(
        payload.ok
          ? payload.message ?? `${task} 刷新完成`
          : payload.errorMessage ?? payload.message ?? `${task} 刷新失败`,
      );
    } catch (requestError) {
      setRefreshMessage(
        requestError instanceof Error ? requestError.message : `${task} 刷新失败`,
      );
    } finally {
      await reloadAll();
      setRefreshingTask(null);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Market"
        title="行情数据中心"
        description="这里是第五阶段的数据可视化验收页：集中展示当前数据源、依赖状态、刷新操作、大盘快照、板块排行、股票列表和最近刷新记录。"
        badge="数据中心"
      />

      <DataStatus
        isLoading={isLoading || providerResource.isLoading}
        usingFallback={usingFallback}
        error={error}
        fallbackReason={fallbackReason}
        provider={provider ?? providerStatus.provider}
        refreshedAt={refreshedAt ?? providerStatus.latestRefresh?.finishedAt ?? null}
        isEmpty={marketData.indexData.length === 0}
        emptyLabel="当前没有可展示的大盘数据。"
        technicalDetails={technicalDetails}
      />

      <Card className="border-cyan-400/20 bg-cyan-400/[0.03]">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <Database className="size-5 text-cyan-200" />
              <CardTitle className="mt-3">顶部状态卡片</CardTitle>
              <CardDescription>
                统一展示 provider、Python 依赖、最近刷新时间和当前刷新状态，方便判断现在看到的是真实 AkShare 数据还是 mock fallback。
              </CardDescription>
            </div>
            <RefreshActionGroup loadingTask={refreshingTask} onRefresh={handleRefresh} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {providerCards.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="rounded-md border border-border bg-secondary/35 p-4"
              >
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-sm font-medium text-foreground">{item.value}</div>
              </div>
            ))}
          </div>

          {refreshMessage ? (
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm text-amber-100">
              {refreshMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {marketData.indexData.map((item, index) => (
          <Card key={`${item.code}-${item.name}-${index}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription>{item.code}</CardDescription>
                </div>
                {item.trend === "up" ? (
                  <TrendingUp className="size-5 text-emerald-300" />
                ) : (
                  <TrendingDown className="size-5 text-rose-300" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">{item.value}</div>
              <div className={item.trend === "up" ? "mt-2 text-sm text-emerald-300" : "mt-2 text-sm text-rose-300"}>
                {item.changePoints} / {item.changePercent}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={<TrendingUp className="size-4" />} label="上涨家数" value={marketData.marketOverview.breadth.rising} helper="市场广度" tone="up" />
        <StatCard icon={<TrendingDown className="size-4" />} label="下跌家数" value={marketData.marketOverview.breadth.falling} helper="市场广度" tone="down" />
        <StatCard icon={<Minus className="size-4" />} label="平盘家数" value={marketData.marketOverview.breadth.unchanged} helper="未明显波动" />
        <StatCard icon={<Flame className="size-4" />} label="涨停数量" value={marketData.marketOverview.breadth.limitUp} helper="情绪观察" tone="up" />
        <StatCard icon={<AlertTriangle className="size-4" />} label="跌停数量" value={marketData.marketOverview.breadth.limitDown} helper="风险释放" tone="down" />
        <StatCard icon={<Gauge className="size-4" />} label="情绪评分" value={marketData.marketOverview.sentiment.score} helper={marketData.marketOverview.sentiment.label} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>大盘数据区</CardTitle>
            <CardDescription>
              {usingFallback ? "当前显示的是 mock fallback 数据。" : "优先展示最新刷新后的真实行情快照。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">两市成交额</div>
                <div className="mt-2 text-4xl font-semibold text-foreground">
                  {marketData.marketOverview.turnover.total}
                </div>
              </div>
              <Badge variant={usingFallback ? "warning" : "success"}>
                {usingFallback ? "Mock Fallback" : `AkShare / ${provider ?? "database"}`}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-secondary/35 p-4">
                <div className="text-xs text-muted-foreground">沪市成交额</div>
                <div className="mt-2 text-xl font-semibold text-foreground">{marketData.marketOverview.turnover.sh}</div>
              </div>
              <div className="rounded-md border border-border bg-secondary/35 p-4">
                <div className="text-xs text-muted-foreground">深市成交额</div>
                <div className="mt-2 text-xl font-semibold text-foreground">{marketData.marketOverview.turnover.sz}</div>
              </div>
            </div>
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm leading-6 text-muted-foreground">
              {marketData.marketOverview.sentiment.description}
            </div>
          </CardContent>
        </Card>

        <LineChartCard
          title="三大指数相对走势"
          description="如果 AkShare 暂时拿不到完整分时，这里会保留展示曲线，不让页面白屏。"
          data={indexTrendData.length > 0 ? indexTrendData : [{ time: "15:00", sh: 0, sz: 0, cyb: 0 }]}
          xKey="time"
          lines={[
            { key: "sh", name: "上证指数", color: "rgb(34, 211, 238)" },
            { key: "sz", name: "深证成指", color: "rgb(52, 211, 153)" },
            { key: "cyb", name: "创业板指", color: "rgb(251, 191, 36)" },
          ]}
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-3">
        <DataTable title="涨幅榜" badge={usingFallback ? "mock fallback" : "real-time snapshot"} columns={moverColumns} data={marketData.marketMovers.gainers} minWidth={820} getRowKey={(row, index) => `${row.code}-${row.reason}-${index}`} />
        <DataTable title="跌幅榜" badge={usingFallback ? "mock fallback" : "real-time snapshot"} columns={moverColumns} data={marketData.marketMovers.losers} minWidth={820} getRowKey={(row, index) => `${row.code}-${row.reason}-${index}`} />
        <DataTable title="成交额榜" badge={usingFallback ? "mock fallback" : "real-time snapshot"} columns={moverColumns} data={marketData.marketMovers.turnoverLeaders} minWidth={820} getRowKey={(row, index) => `${row.code}-${row.reason}-${index}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          title="板块数据区"
          badge={sectorsResource.usingFallback ? "mock fallback" : "latest sectors"}
          columns={sectorColumns}
          data={topSectorRows}
          minWidth={760}
          getRowKey={(row, index) => `${row.name}-${row.rank}-${index}`}
        />
        <DataTable
          title="股票数据区"
          badge={stocksResource.usingFallback ? "mock fallback" : "latest stocks"}
          columns={stockColumns}
          data={topStockRows}
          minWidth={900}
          getRowKey={(row, index) => `${row.code}-${row.rating}-${index}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近刷新记录</CardTitle>
          <CardDescription>最近 10 条记录会显示成功、失败、部分成功和耗时，方便快速定位问题。</CardDescription>
        </CardHeader>
        <CardContent>
          <RefreshLogList logs={logs} emptyLabel="当前还没有刷新记录。" />
        </CardContent>
      </Card>
    </section>
  );
}
