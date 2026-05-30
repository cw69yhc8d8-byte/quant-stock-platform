import { ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RiskAlertProps = {
  title?: string;
  description?: string;
  notes: string[];
  className?: string;
};

export function RiskAlert({
  title = "风险提示",
  description = "所有信号均为研究线索，不代表投资建议。",
  notes,
  className,
}: RiskAlertProps) {
  return (
    <Card className={cn("border-amber-400/25 bg-amber-400/[0.04]", className)}>
      <CardHeader>
        <ShieldAlert className="size-5 text-amber-200" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.map((note, index) => (
          <div
            key={`${note}-${index}`}
            className="rounded-md border border-amber-400/15 bg-background/50 p-3 text-sm leading-6 text-muted-foreground"
          >
            {note}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
