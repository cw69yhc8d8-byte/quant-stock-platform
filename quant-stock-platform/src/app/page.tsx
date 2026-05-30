import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Flame,
  LineChart,
} from "lucide-react";

import { LineChartCard } from "@/components/charts/line-chart-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RiskAlert } from "@/components/ui/risk-alert";
import { StatCard } from "@/components/ui/stat-card";
import {
  indexData,
  intradayMarketFlow,
  marketOverview,
  riskNotes,
  sectorRankings,
  stockWatchlist,
} from "@/lib/mock-data";
import type { StockWatchItem } from "@/lib/types";

const watchColumns: DataTableColumn<StockWatchItem>[] = [
  {
    key: "code",
    header: "代码",
    className: "font-mono text-cyan-200",
  },
  {
    key: "name",
    header: "名称",
    className: "text-foreground",
  },
  {
    key: "rating",
    header: "评级",
    render: (row) => <Badge variant="secondary">{row.rating}</Badge>,
  },
  {
    key: "buyTrigger",
    header: "观察触发",
  },
  {
    key: "risk",
    header: "主要风险",
    className: "text-amber-200",
  },
];

export default function Home() {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="市场研究总览"
        description="当前展示均为模拟数据，用于验证页面原型、信息结构和复盘工作流。"
        badge={`风险等级：${marketOverview.riskLevel}`}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {indexData.map((item, index) => {
          const isUp = item.trend === "up";
          const Icon = isUp ? ArrowUpRight : ArrowDownRight;

          return (
            <Card key={`${item.code}-${item.name}-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.code}</CardDescription>
                  </div>
                  <Icon
                    className={
                      isUp ? "size-5 text-emerald-300" : "size-5 text-rose-300"
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-foreground">
                  {item.value}
                </div>
                <div
                  className={
                    isUp
                      ? "mt-2 text-sm text-emerald-300"
                      : "mt-2 text-sm text-rose-300"
                  }
                >
                  {item.changePoints} / {item.changePercent}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<Activity className="size-4" />}
          label="今日涨跌家数"
          value={`${marketOverview.breadth.rising} / ${marketOverview.breadth.falling}`}
          helper={`平盘 ${marketOverview.breadth.unchanged} 家`}
        />
        <StatCard
          icon={<BarChart3 className="size-4" />}
          label="市场成交额"
          value={marketOverview.turnover.total}
          helper={`较昨日 ${marketOverview.turnover.change}`}
        />
        <StatCard
          icon={<Flame className="size-4" />}
          label="涨停数量"
          value={marketOverview.breadth.limitUp}
          helper="观察市场情绪"
          tone="up"
        />
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label="跌停数量"
          value={marketOverview.breadth.limitDown}
          helper="观察风险释放"
          tone="down"
        />
        <StatCard
          icon={<LineChart className="size-4" />}
          label="市场情绪"
          value={marketOverview.sentiment.score}
          helper={marketOverview.sentiment.label}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <LineChartCard
          title="市场成交额模拟曲线"
          description="mock 日内成交额曲线，用于展示图表能力。"
          data={intradayMarketFlow}
          xKey="time"
          lines={[{ key: "amount", name: "成交额", color: "rgb(34, 211, 238)" }]}
        />

        <Card>
          <CardHeader>
            <CardTitle>热点板块排行榜</CardTitle>
            <CardDescription>
              基于 mock 热度、涨跌幅和成交额的静态排行。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectorRankings.slice(0, 5).map((sector, index) => (
              <div
                key={`${sector.name}-${sector.rank}-${index}`}
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-md border border-border bg-secondary/35 p-3"
              >
                <div className="text-sm font-semibold text-cyan-200">
                  {sector.rank}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {sector.name}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${sector.heat}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-emerald-300">
                    {sector.changePercent}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sector.turnover}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DataTable
          title="今日量化观察标的"
          badge="研究线索"
          columns={watchColumns}
          data={stockWatchlist.slice(0, 4)}
          minWidth={780}
          getRowKey={(row, index) => `${row.code}-${row.rating}-${index}`}
        />

        <RiskAlert
          description="第二阶段仍只做静态产品原型和模拟数据展示。"
          notes={riskNotes}
        />
      </div>
    </section>
  );
}
