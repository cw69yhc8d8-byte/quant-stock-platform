"use client";

import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  Plus,
  TrendingDown,
  Trophy,
} from "lucide-react";

import { LineChartCard } from "@/components/charts/line-chart-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataStatus } from "@/components/ui/data-status";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useApiResource } from "@/lib/use-api-resource";
import { tradeJournal as fallbackTradeJournal } from "@/lib/mock-data";
import type { TradeJournal, TradeJournalRecord } from "@/lib/types";

const journalColumns: DataTableColumn<TradeJournalRecord>[] = [
  { key: "code", header: "股票代码", className: "font-mono text-cyan-200" },
  { key: "name", header: "股票名称", className: "text-foreground" },
  { key: "buyDate", header: "买入日期" },
  { key: "buyPrice", header: "买入价", align: "right" },
  { key: "sellDate", header: "卖出日期" },
  { key: "sellPrice", header: "卖出价", align: "right" },
  { key: "position", header: "仓位", align: "right" },
  {
    key: "pnlPercent",
    header: "盈亏比例",
    align: "right",
    render: (row) => (
      <span
        className={
          row.pnlPercent.startsWith("-")
            ? "text-rose-300"
            : "text-emerald-300"
        }
      >
        {row.pnlPercent}
      </span>
    ),
  },
  { key: "buyReason", header: "买入理由" },
  { key: "sellReason", header: "卖出理由" },
  { key: "review", header: "复盘总结" },
];

const fallbackJournalData: { tradeJournal: TradeJournal } = {
  tradeJournal: fallbackTradeJournal,
};

export default function JournalPage() {
  const { data, isLoading, error, usingFallback } = useApiResource(
    "/api/journal",
    fallbackJournalData,
  );
  const { tradeJournal } = data;
  const stats = tradeJournal.stats;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Journal"
        title="交易记录"
        description="用于复盘交易计划、执行结果、买卖理由和纪律执行情况。当前为 mock 数据。"
        badge="复盘辅助"
      />
      <DataStatus
        isLoading={isLoading}
        usingFallback={usingFallback}
        error={error}
      />

      <div className="flex justify-end">
        <Button variant="outline" disabled>
          <Plus className="size-4" />
          新增交易记录
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<BookOpenCheck className="size-4" />}
          label="累计交易次数"
          value={stats.totalTrades}
          helper="已记录交易"
        />
        <StatCard
          icon={<Trophy className="size-4" />}
          label="胜率"
          value={stats.winRate}
          helper="盈利交易占比"
        />
        <StatCard
          icon={<BarChart3 className="size-4" />}
          label="累计收益"
          value={stats.totalReturn}
          helper="mock 统计"
          tone="up"
        />
        <StatCard
          icon={<TrendingDown className="size-4" />}
          label="最大回撤"
          value={stats.maxDrawdown}
          helper="风险回撤"
          tone="down"
        />
        <StatCard
          icon={<Briefcase className="size-4" />}
          label="当前持仓数量"
          value={stats.currentPositions}
          helper="模拟持仓"
        />
      </div>

      <LineChartCard
        title="mock 盈亏曲线"
        description="用于展示交易记录页的累计收益变化。"
        data={tradeJournal.pnlCurve}
        xKey="date"
        lines={[{ key: "value", name: "累计收益", color: "rgb(52, 211, 153)" }]}
      />

      <DataTable
        title="交易记录表格"
        columns={journalColumns}
        data={tradeJournal.records}
        minWidth={1420}
        getRowKey={(row, index) => `${row.code}-${row.buyDate}-${row.sellDate}-${index}`}
      />

      <Card className="border-amber-400/25 bg-amber-400/[0.04]">
        <CardHeader>
          <AlertTriangle className="size-5 text-amber-200" />
          <CardTitle>复盘提醒</CardTitle>
          <CardDescription>
            每笔交易必须记录买入理由和卖出理由，否则无法判断策略是否被一致执行。
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
