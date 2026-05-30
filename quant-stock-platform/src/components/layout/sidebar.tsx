"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CandlestickChart,
  Gauge,
  Layers3,
  NotebookPen,
  Settings,
} from "lucide-react";

import { routePages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  "/": Gauge,
  "/market": CandlestickChart,
  "/sectors": Layers3,
  "/stocks": BarChart3,
  "/strategy": BrainCircuit,
  "/report": BookOpenText,
  "/journal": NotebookPen,
  "/settings": Settings,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block">
      <div className="flex h-full min-h-[100dvh] flex-col">
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-cyan-400/30 bg-cyan-400/10">
              <CandlestickChart className="size-5 text-cyan-200" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Quant Research
              </div>
              <div className="text-xs text-muted-foreground">
                投资研究与交易复盘辅助系统
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {routePages.map((item) => {
            const Icon = iconMap[item.href];
            const active = pathname === item.href;

            return (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-5 py-4 text-xs leading-5 text-muted-foreground">
          <div className="font-medium text-foreground">当前阶段</div>
          <div>静态产品原型，mock 数据，不接真实行情。</div>
        </div>
      </div>
    </aside>
  );
}
