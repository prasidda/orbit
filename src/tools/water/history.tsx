"use client";

import { useQuery } from "convex/react";
import { Flame } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import {
  HistoryChart,
  RangePicker,
  useHistoryRange,
} from "@/components/history-chart";
import { formatCups } from "@/lib/units";

/** Days in a row, counting back from the most recent, where the goal was met. */
function streakFrom(days: { date: string; totalMl: number }[], goalMl: number): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].totalMl >= goalMl) streak++;
    else break;
  }
  return streak;
}

export function WaterHistory() {
  const { days, setDays, from, to } = useHistoryRange(14);
  const history = useQuery(api.water.history, { from, to });

  return (
    <Card className="space-y-4 p-5">
      <CardHead
        label="History"
        trailing={<RangePicker days={days} onChange={setDays} />}
      />

      {history === undefined ? (
        <Skeleton className="h-36 w-full rounded-tile" />
      ) : (
        <>
          <HistoryChart
            data={history.days.map((d) => ({ date: d.date, value: d.totalMl }))}
            from={from}
            to={to}
            goal={history.goalMl}
            accent="var(--tool-water)"
            formatValue={(ml) => formatCups(ml)}
            emptyLabel="No water logged in this stretch."
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Goal {formatCups(history.goalMl)}</Badge>
            {history.days.length > 0 ? (
              <Badge tone="neutral">
                Best {formatCups(Math.max(...history.days.map((d) => d.totalMl)))}
              </Badge>
            ) : null}
            {(() => {
              const streak = streakFrom(history.days, history.goalMl);
              return streak > 0 ? (
                <Badge tone="terracotta">
                  <Flame className="size-3" />
                  {streak} day{streak === 1 ? "" : "s"} on goal
                </Badge>
              ) : null;
            })()}
          </div>
        </>
      )}
    </Card>
  );
}
