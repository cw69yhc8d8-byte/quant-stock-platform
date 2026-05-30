import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RefreshTask } from "@/lib/system-types";

const refreshTasks: RefreshTask[] = ["market", "sectors", "stocks", "all"];

export function RefreshActionGroup({
  loadingTask,
  onRefresh,
}: {
  loadingTask: RefreshTask | null;
  onRefresh: (task: RefreshTask) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {refreshTasks.map((taskType) => (
        <Button
          key={`${taskType}-action`}
          variant={taskType === "all" ? "default" : "outline"}
          onClick={() => onRefresh(taskType)}
          disabled={loadingTask !== null}
        >
          <RefreshCcw
            className={loadingTask === taskType ? "size-4 animate-spin" : "size-4"}
          />
          刷新 {taskType}
        </Button>
      ))}
    </div>
  );
}
