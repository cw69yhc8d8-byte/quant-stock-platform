import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  tone?: "neutral" | "up" | "down" | "warning";
};

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground">{icon}</div>
          <div className="text-right text-xs text-muted-foreground">{label}</div>
        </div>
        <div
          className={cn(
            "mt-4 text-2xl font-semibold text-foreground",
            tone === "up" && "text-emerald-300",
            tone === "down" && "text-rose-300",
            tone === "warning" && "text-amber-200",
          )}
        >
          {value}
        </div>
        {helper ? (
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {helper}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
