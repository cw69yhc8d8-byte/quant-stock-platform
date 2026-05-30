import { RiskFooter } from "@/components/layout/risk-footer";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[16rem_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col overflow-x-hidden">
          <Topbar />
          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
            <div className="mx-auto max-w-[1400px] min-w-0">{children}</div>
          </main>
          <RiskFooter />
        </div>
      </div>
    </div>
  );
}
