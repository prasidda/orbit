"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarSync, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Card, CardHead } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { todayKey, fromDateKey } from "@/lib/dates";
import { DAYS, DayToggles, describeDays } from "./day-toggles";
import { cn } from "@/lib/utils";

/**
 * The sessions that repeat, and which days they land on.
 *
 * There's no separate "split" concept — a split just *is* your sessions with
 * their days, and these are the same rules the calendar reads, so a change
 * here shows there immediately.
 */
export function SessionSchedule() {
  const rules = useQuery(api.recurrences.list);
  const setDays = useMutation(api.recurrences.setDays);
  const remove = useMutation(api.recurrences.remove);

  const sessions = (rules ?? []).filter((r) => r.tool === "workouts");
  const todayWeekday = fromDateKey(todayKey()).getDay();

  return (
    <Card className="space-y-4 p-5">
      <CardHead
        label="Your week"
        icon={CalendarSync}
        accent="var(--tool-workouts)"
        trailing={
          sessions.length > 0 ? (
            <span className="text-xs text-ink-faint">also on the calendar</span>
          ) : null
        }
      />

      {rules === undefined ? (
        <Skeleton className="h-24 w-full rounded-tile" />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No repeating sessions yet. Add one with{" "}
          <span className="font-medium text-ink">Session</span> above and pick the days it lands
          on — legs on Monday, arms on Tuesday.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-7 gap-1">
            {DAYS.map((day, index) => {
              const planned = sessions.filter((r) => r.byDay.includes(index));
              const isToday = index === todayWeekday;
              return (
                <li
                  key={index}
                  className={cn(
                    "min-h-16 rounded-tile px-1 py-1.5 text-center",
                    isToday ? "bg-terracotta-soft" : "bg-surface-sunk"
                  )}
                >
                  <p
                    className={cn(
                      "text-[0.625rem] font-bold uppercase",
                      isToday ? "text-terracotta-ink" : "text-ink-faint"
                    )}
                  >
                    {day.short}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {planned.length === 0 ? (
                      <span className="text-[0.625rem] text-ink-faint">rest</span>
                    ) : (
                      planned.map((rule) => (
                        <p
                          key={rule._id}
                          title={rule.title}
                          className="truncate text-[0.625rem] font-medium leading-tight"
                        >
                          {rule.title}
                        </p>
                      ))
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <ul className="space-y-2">
            {sessions.map((rule) => (
              <li key={rule._id} className="rounded-tile bg-surface-sunk px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{rule.title}</p>
                    <p className="truncate text-xs text-ink-faint">{describeDays(rule.byDay)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Stop repeating ${rule.title}`}
                    onClick={async () => {
                      await remove({ recurrenceId: rule._id });
                      toast(`${rule.title} no longer repeats`, {
                        description: "Sessions you already logged are untouched.",
                      });
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <DayToggles
                  className="mt-2"
                  selected={rule.byDay}
                  onToggle={(day) => {
                    const next = rule.byDay.includes(day)
                      ? rule.byDay.filter((d) => d !== day)
                      : [...rule.byDay, day];
                    void setDays({ recurrenceId: rule._id, byDay: next });
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
