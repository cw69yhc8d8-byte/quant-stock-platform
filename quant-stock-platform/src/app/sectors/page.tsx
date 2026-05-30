"use client";

import { AlertTriangle, CheckCircle2, Database, Eye, Flame, XCircle } from "lucide-react";

import { BarChartCard } from "@/components/charts/bar-chart-card";
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
import type { SectorOverviewData } from "@/lib/api-data";
import type { ProviderStatusPayload } from "@/lib/system-types";
import { useApiResource } from "@/lib/use-api-resource";
import {
  sectorDirections,
  sectorRankings as fallbackSectorRankings,
} from "@/lib/mock-data";

const fallbackSectorData: SectorOverviewData = {
  sectorRankings: fallbackSectorRankings,
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

export default function SectorsPage() {
  const resource = useApiResource("/api/sectors", fallbackSectorData);
  const providerResource = useApiResource("/api/system/data-provider", fallbackProviderData);
  const sectorRankings = resource.data.sectorRankings;
  const sectorHeatData = sectorRankings.map((sector) => ({
    name: sector.name,
    heat: sector.heat,
  }));

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Sectors"
        title="热点板块"
        description="板块页现在会明确显示当前数据源、最近刷新时间，以及当前是不是 AkShare 真实结果还是 mock fallback。"
        badge="板块轮动观察"
      />

      <DataStatus
        isLoading={resource.isLoading}
        usingFallback={resource.usingFallback}
        error={resource.error}
        fallbackReason={resource.fallbackReason}
        provider={resource.provider ?? providerResource.data.provider}
        refreshedAt={resource.refreshedAt}
        isEmpty={sectorRankings.length === 0}
        emptyLabel="当前没有板块数据。"
        technicalDetails={[
          providerResource.data.message,
          resource.fallbackReason ?? "",
          resource.error ?? "",
        ].filter(Boolean)}
      />

      <Card className="border-cyan-400/20 bg-cyan-400/[0.03]">
        <CardHeader>
          <Database className="size-5 text-cyan-200" />
          <CardTitle>板块数据源</CardTitle>
          <CardDescription>
            当前页面会优先展示最新板块数据，并在 AkShare 不可用时自动回退到 mock fallback。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <InfoCard
            label="当前显示来源"
            value={resource.usingFallback ? "Mock Fallback" : `AkShare / ${resource.provider ?? "database"}`}
          />
          <InfoCard label="最近刷新时间" value={formatTime(resource.refreshedAt)} />
          <InfoCard label="当前 Provider" value={`${providerResource.data.label} / ${providerResource.data.status}`} />
          <InfoCard label="数据更新时间" value={formatTime(resource.updatedAt)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>热点板块排行榜</CardTitle>
            <CardDescription>
              排名、热度和风险标签用于模拟投研系统的板块决策视图。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectorRankings.map((sector, index) => (
              <div
                key={`${sector.name}-${sector.rank}-${index}`}
                className="rounded-md border border-border bg-secondary/30 p-4"
              >
                <div className="grid gap-4 lg:grid-cols-[2rem_1fr_auto] lg:items-center">
                  <div className="text-lg font-semibold text-cyan-200">{sector.rank}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{sector.name}</h3>
                      <Badge
                        variant={
                          sector.riskLevel === "高"
                            ? "danger"
                            : sector.riskLevel === "中"
                              ? "warning"
                              : "success"
                        }
                      >
                        风险 {sector.riskLevel}
                      </Badge>
                      <Badge variant="secondary">{sector.focus}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
                      <div>涨跌幅：{sector.changePercent}</div>
                      <div>成交额：{sector.turnover}</div>
                      <div>涨停：{sector.limitUp}</div>
                      <div>龙头：{sector.leader}</div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${sector.heat}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-foreground">{sector.heat}</div>
                    <div className="text-xs text-muted-foreground">热度评分</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <BarChartCard
          title="板块热度柱状图"
          description="当真实板块刷新失败时，这里仍会保留 fallback 数据，避免页面空白。"
          data={sectorHeatData}
          xKey="name"
          yKey="heat"
          barName="热度评分"
          height={360}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DirectionCard
          title="今日强势方向"
          icon={<CheckCircle2 className="size-5 text-emerald-300" />}
          items={sectorDirections.strong}
          description="优先观察板块内中军和回踩确认机会。"
        />
        <DirectionCard
          title="谨慎方向"
          icon={<Eye className="size-5 text-amber-200" />}
          items={sectorDirections.cautious}
          description="可跟踪但不追高，等待分歧后再评估。"
        />
        <DirectionCard
          title="不碰方向"
          icon={<XCircle className="size-5 text-rose-300" />}
          items={sectorDirections.avoid}
          description="弱势或高位缩量方向，先纳入风险观察。"
        />
      </div>

      <Card>
        <CardHeader>
          <Flame className="size-5 text-cyan-200" />
          <CardTitle>板块轮动说明</CardTitle>
          <CardDescription>
            当前页重点是把真实行情与 fallback 的状态说清楚，轮动说明仍用于辅助投研浏览。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {sectorRankings.slice(0, 3).map((sector, index) => (
            <div key={`${sector.name}-${sector.rank}-${index}`} className="rounded-md border border-border bg-secondary/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="size-4 text-amber-200" />
                {sector.name}
              </div>
              <div className="mt-3 text-sm leading-6 text-muted-foreground">{sector.rotation}</div>
            </div>
          ))}
        </CardContent>
      </Card>
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

function DirectionCard({
  title,
  icon,
  items,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-md border border-border bg-secondary/35 px-3 py-2 text-sm text-foreground">
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
