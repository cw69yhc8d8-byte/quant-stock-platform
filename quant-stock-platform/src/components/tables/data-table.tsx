import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  title?: string;
  badge?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  minWidth?: number;
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string;
};

export function DataTable<T extends object>({
  title,
  badge,
  columns,
  data,
  minWidth = 760,
  emptyMessage = "暂无数据",
  getRowKey,
}: DataTableProps<T>) {
  return (
    <Card>
      {title ? (
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </CardHeader>
      ) : null}
      <CardContent className="max-w-full overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth }}
        >
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={`${String(column.key)}-${column.header}`}
                  className={cn(
                    "py-3 pr-4 font-medium",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey ? getRowKey(row, rowIndex) : `row-${rowIndex}`}
                  className="border-b border-border/70 last:border-b-0"
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={`${String(column.key)}-${column.header}-${columnIndex}`}
                      className={cn(
                        "py-3 pr-4 align-top text-muted-foreground",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.className,
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
