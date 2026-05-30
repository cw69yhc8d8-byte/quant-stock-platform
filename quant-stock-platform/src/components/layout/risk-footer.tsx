import { ShieldAlert } from "lucide-react";

import { riskDisclaimer } from "@/lib/mock-data";

export function RiskFooter() {
  return (
    <footer className="border-t border-border bg-background/95 px-5 py-4 text-xs leading-5 text-muted-foreground lg:px-8">
      <div className="mx-auto flex max-w-[1400px] items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
        <p>{riskDisclaimer}</p>
      </div>
    </footer>
  );
}
