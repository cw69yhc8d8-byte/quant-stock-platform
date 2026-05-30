import { CalendarDays, Database, Info, ListChecks, Play } from "lucide-react";

import { LineChartCard } from "@/components/charts/line-chart-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { backtestResult } from "@/lib/mock-data";
import type { BacktestTrade } from "@/lib/types";

const tradeColumns: DataTableColumn<BacktestTrade>[] = [
  { key: "date", header: "日期", className: "text-foreground" },
  { key: "code", header: "代码", className: "font-mono text-cyan-200" },
  { key: "name", header: "名称", className: "text-foreground" },
  {
    key: "action",
    header: "动作",
    render: (row) => (
      <Badge variant={row.action === "买入" ? "success" : "warning"}>
        {row.action}
      </Badge>
    ),
  },
  { key: "price", header: "价格", align: "right" },
  { key: "position", header: "仓位", align: "right" },
  {
    key: "pnl",
    header: "盈亏",
    align: "right",
    render: (row) => (
      <span className={row.pnl.startsWith("-") ? "text-rose-300" : "text-emerald-300"}>
        {row.pnl}
      </span>
    ),
  },
  { key: "note", header: "备注" },
];

export default function StrategyPage() {
  const metrics = backtestResult.metrics;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Strategy"
        title="策略回测"
        description="当前为静态模拟回测页面，后续接入真实历史行情后启用计算。"
        badge="模拟回测"
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>回测参数</CardTitle>
            <CardDescription>
              输入框和选择器为占位控件，当前不提交任何真实任务。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="策略名称">
              <input
                value={backtestResult.strategyName}
                readOnly
                className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none"
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="回测时间区间">
                <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" />
                  {backtestResult.range}
                </div>
              </Field>
              <Field label="股票池选择">
                <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm text-muted-foreground">
                  <Database className="size-4" />
                  {backtestResult.universe}
                </div>
              </Field>
            </div>
            <Button className="w-full" disabled>
              <Play className="size-4" />
              运行模拟回测占位
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListChecks className="size-5 text-cyan-200" />
              <CardTitle>策略规则展示</CardTitle>
            </div>
            <CardDescription>
              规则用于产品原型展示，不代表有效交易策略。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {backtestResult.rules.map((rule, index) => (
              <div
                key={`${rule}-${index}`}
                className="rounded-md border border-border bg-secondary/35 p-4"
              >
                <div className="text-xs text-cyan-200">Rule {index + 1}</div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  {rule}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="总收益率" value={metrics.totalReturn} helper="mock result" tone="up" />
        <StatCard label="最大回撤" value={metrics.maxDrawdown} helper="风险指标" tone="down" />
        <StatCard label="胜率" value={metrics.winRate} helper="盈利交易占比" />
        <StatCard label="盈亏比" value={metrics.profitLossRatio} helper="平均盈利/亏损" />
        <StatCard label="交易次数" value={metrics.tradeCount} helper="模拟成交" />
        <StatCard label="平均持仓" value={metrics.averageHoldingDays} helper="持仓周期" />
      </div>

      <LineChartCard
        title="策略净值曲线"
        description="mock 策略净值，仅用于展示回测结果模块。"
        data={backtestResult.equityCurve}
        xKey="date"
        lines={[{ key: "value", name: "策略净值", color: "rgb(34, 211, 238)" }]}
      />

      <DataTable
        title="mock 交易明细"
        columns={tradeColumns}
        data={backtestResult.trades}
        minWidth={920}
        getRowKey={(row, index) => `${row.code}-${row.date}-${row.action}-${index}`}
      />

      <Card className="border-amber-400/25 bg-amber-400/[0.04]">
        <CardHeader>
          <Info className="size-5 text-amber-200" />
          <CardTitle>模拟回测提示</CardTitle>
          <CardDescription>
            当前为模拟回测页面，后续接入真实历史行情后启用。不要将当前结果用于实盘交易。
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
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
