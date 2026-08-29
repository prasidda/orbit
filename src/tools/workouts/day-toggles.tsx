"use client";

import { cn } from "@/lib/utils";

/** Index is the JS weekday number, so the array doubles as the lookup. */
export const DAYS = [
  { short: "S", full: "Sunday" },
  { short: "M", full: "Monday" },
  { short: "T", full: "Tuesday" },
  { short: "W", full: "Wednesday" },
  { short: "T", full: "Thursday" },
  { short: "F", full: "Friday" },
  { short: "S", full: "Saturday" },
];

export function DayToggles({
  selected,
  onToggle,
  size = "sm",
  className,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      {DAYS.map((day, index) => {
        const on = selected.includes(index);
        return (
          <button
            key={index}
            type="button"
            aria-label={day.full}
            aria-pressed={on}
            onClick={() => onToggle(index)}
            className={cn(
              "grid shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
              size === "md" ? "size-9" : "size-7",
              on ? "bg-workouts text-white" : "bg-surface-sunk text-ink-faint hover:text-ink"
            )}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

/** "every Monday and Thursday" — reads better than a row of letters alone. */
export function describeDays(byDay: number[]): string {
  if (byDay.length === 0) return "doesn't repeat";
  if (byDay.length === 7) return "every day";
  const names = [...byDay].sort().map((d) => DAYS[d].full);
  if (names.length === 1) return `every ${names[0]}`;
  return `every ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
