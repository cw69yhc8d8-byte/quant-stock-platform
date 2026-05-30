"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BarChartCardProps<T extends object> = {
  title: string;
  description?: string;
  data: T[];
  xKey: string;
  yKey: string;
  barName: string;
  height?: number;
};

export function BarChartCard<T extends object>({
  title,
  description,
  data,
  xKey,
  yKey,
  barName,
  height = 280,
}: BarChartCardProps<T>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(148, 163, 184, 0.16)"
                  vertical={false}
                />
                <XAxis
                  dataKey={xKey}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgb(148, 163, 184)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgb(148, 163, 184)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(103, 232, 249, 0.08)" }}
                  contentStyle={{
                    background: "rgb(15, 23, 42)",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: 8,
                    color: "rgb(226, 232, 240)",
                  }}
                  labelStyle={{ color: "rgb(125, 211, 252)" }}
                />
                <Bar
                  dataKey={yKey}
                  name={barName}
                  fill="rgb(34, 211, 238)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-md bg-secondary/35" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
