"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Circle, Database, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routePages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Circle className="size-2 fill-emerald-400 text-emerald-400" />
            模拟行情环境
            <span className="text-border">|</span>
            更新 15:00:00
          </div>
          <h1 className="mt-1 text-base font-semibold text-foreground">
            量化炒股网页平台
          </h1>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="warning">不接真实行情</Badge>
          <Badge variant="secondary">不做自动交易</Badge>
          <Button variant="outline" size="sm">
            <Search className="size-4" />
            搜索标的
          </Button>
          <Button variant="ghost" size="icon" aria-label="数据状态">
            <Database className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="提醒">
            <Bell className="size-4" />
          </Button>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-t border-border px-5 py-2 lg:hidden">
        {routePages.map((item) => (
          <Link
            key={`${item.href}-${item.title}`}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors",
              pathname === item.href
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
