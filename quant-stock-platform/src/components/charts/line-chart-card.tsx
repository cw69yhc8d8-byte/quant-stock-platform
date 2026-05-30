"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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

type LineSpec = {
  key: string;
  name: string;
  color?: string;
};

type LineChartCardProps<T extends object> = {
  title: string;
  description?: string;
  data: T[];
  xKey: string;
  lines: LineSpec[];
  height?: number;
};

export function LineChartCard<T extends object>({
  title,
  description,
  data,
  xKey,
  lines,
  height = 280,
}: LineChartCardProps<T>) {
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
              <LineChart
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
                  cursor={{ stroke: "rgba(103, 232, 249, 0.35)" }}
                  contentStyle={{
                    background: "rgb(15, 23, 42)",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: 8,
                    color: "rgb(226, 232, 240)",
                  }}
                  labelStyle={{ color: "rgb(125, 211, 252)" }}
                />
                {lines.map((line, index) => (
                  <Line
                    key={`${line.key}-${line.name}-${index}`}
                    type="monotone"
                    dataKey={line.key}
                    name={line.name}
                    stroke={line.color ?? "rgb(34, 211, 238)"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-md bg-secondary/35" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
