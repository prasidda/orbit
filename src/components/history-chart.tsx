"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fromDateKey, rangeKeys, shiftKey, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const RANGES = [
  { days: 14, label: "2w" },
  { days: 30, label: "1m" },
  { days: 90, label: "3m" },
  { days: 365, label: "1y" },
] as const;

/**
 * Owns the visible window. The chart scrolls horizontally rather than
 * squeezing more bars into the same width — at 90 days, compressed bars stop
 * being readable, and scrolling keeps every day the same size.
 */
export function useHistoryRange(initialDays = 14) {
  const [days, setDays] = useState(initialDays);
  const to = todayKey();
  const from = shiftKey(to, -(days - 1));
  return { days, setDays, from, to };
}

export function RangePicker({
  days,
  onChange,
  className,
}: {
  days: number;
  onChange: (days: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-surface-sunk p-1", className)}>
      {RANGES.map((range) => (
        <button
          key={range.days}
          type="button"
          onClick={() => onChange(range.days)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            days === range.days
              ? "bg-surface text-ink shadow-[0_1px_2px_rgb(43_38_34/0.06)]"
              : "text-ink-faint hover:text-ink"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export type HistoryPoint = { date: string; value: number };

/**
 * A scrollable bar chart with an optional goal line.
 *
 * Hand-rolled rather than pulled from a chart library because the whole point
 * is the horizontal scroll: bars keep a fixed width and the container scrolls,
 * which charting libraries fight by design (they fit to their container).
 */
export function HistoryChart({
  data,
  from,
  to,
  goal,
  accent = "var(--tool-water)",
  goalAccent = "var(--sage)",
  formatValue,
  emptyLabel = "Nothing logged in this stretch.",
}: {
  data: HistoryPoint[];
  from: string;
  to: string;
  goal?: number;
  accent?: string;
  goalAccent?: string;
  formatValue: (value: number) => string;
  emptyLabel?: string;
}) {
  // Fill gaps so a missed day is an empty slot, not a missing bar.
  const byDate = new Map(data.map((d) => [d.date, d.value]));
  const points = rangeKeys(fromDateKey(from), fromDateKey(to)).map((date) => ({
    date,
    value: byDate.get(date) ?? 0,
  }));

  const max = Math.max(goal ?? 0, ...points.map((p) => p.value), 1);
  const hasAny = points.some((p) => p.value > 0);
  const goalPct = goal ? (goal / max) * 100 : null;

  // Fewer labels as the window grows, so they never collide.
  const labelEvery = points.length <= 14 ? 1 : points.length <= 31 ? 3 : points.length <= 90 ? 10 : 30;

  return (
    <div className="space-y-2">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="relative flex h-36 items-end gap-1"
          style={{ minWidth: `${points.length * 16}px` }}
        >
          {goalPct !== null ? (
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line-strong"
              style={{ bottom: `${goalPct}%` }}
              aria-hidden
            />
          ) : null}

          {points.map((point) => {
            const pct = (point.value / max) * 100;
            const met = goal !== undefined && point.value >= goal;
            return (
              <div
                key={point.date}
                className="flex h-full min-w-3 flex-1 flex-col justify-end"
                title={`${format(fromDateKey(point.date), "EEE d MMM")} — ${formatValue(point.value)}`}
              >
                <div
                  className="w-full rounded-full transition-[height] duration-300"
                  style={{
                    height: `${Math.max(pct, point.value > 0 ? 4 : 2)}%`,
                    background: point.value === 0 ? "var(--surface-sunk)" : met ? goalAccent : accent,
                  }}
                />
              </div>
            );
          })}
        </div>

        <div
          className="mt-1.5 flex gap-1"
          style={{ minWidth: `${points.length * 16}px` }}
          aria-hidden
        >
          {points.map((point, i) => (
            <div key={point.date} className="min-w-3 flex-1 text-center">
              {i % labelEvery === 0 ? (
                <span className="text-[0.5625rem] text-ink-faint">
                  {format(fromDateKey(point.date), points.length <= 14 ? "EEEEE" : "d MMM")}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {!hasAny ? <p className="text-xs text-ink-faint">{emptyLabel}</p> : null}
    </div>
  );
}
