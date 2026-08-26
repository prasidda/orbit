"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Flame } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { fromDateKey, rangeKeys } from "@/lib/dates";
import { Card, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { formatLitres } from "./use-water";

/** Days in a row, counting back from today, where the goal was met. */
function streakFrom(days: { date: string; totalMl: number }[], goalMl: number): number {
  const byDate = new Map(days.map((d) => [d.date, d.totalMl]));
  const keys = [...byDate.keys()].sort();
  if (keys.length === 0) return 0;

  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if ((byDate.get(keys[i]) ?? 0) >= goalMl) streak++;
    else break;
  }
  return streak;
}

export function WaterHistory({ from, to }: { from: string; to: string }) {
  const history = useQuery(api.water.history, { from, to });

  if (history === undefined) {
    return (
      <Card className="space-y-3 p-5">
        <CardHead label="Last 14 days" />
        <Skeleton className="h-32 w-full rounded-tile" />
      </Card>
    );
  }

  // Fill gaps so missed days render as empty slots rather than vanishing.
  const totals = new Map(history.days.map((d) => [d.date, d.totalMl]));
  const data = rangeKeys(fromDateKey(from), fromDateKey(to)).map((date) => ({
    date,
    label: format(fromDateKey(date), "EEEEE"),
    totalMl: totals.get(date) ?? 0,
  }));

  const streak = streakFrom(data, history.goalMl);
  const best = Math.max(history.goalMl, ...data.map((d) => d.totalMl));

  return (
    <Card className="space-y-4 p-5">
      <CardHead
        label="Last 14 days"
        trailing={
          streak > 0 ? (
            <Badge tone="terracotta">
              <Flame className="size-3" />
              {streak} day{streak === 1 ? "" : "s"} on goal
            </Badge>
          ) : null
        }
      />

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={4}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            />
            <ReferenceLine
              y={history.goalMl}
              stroke="var(--line-strong)"
              strokeDasharray="3 3"
            />
            <Bar dataKey="totalMl" radius={[6, 6, 6, 6]} maxBarSize={22} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.date}
                  fill={d.totalMl >= history.goalMl ? "var(--sage)" : "var(--tool-water)"}
                  fillOpacity={d.totalMl === 0 ? 0.18 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-ink-faint">
        Goal {formatLitres(history.goalMl)} · best day {formatLitres(best)}
      </p>
    </Card>
  );
}
