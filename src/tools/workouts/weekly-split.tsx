"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarSync, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { todayKey, fromDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Index is the JS weekday number, so the array doubles as the lookup. */
const DAYS = [
  { short: "S", full: "Sunday" },
  { short: "M", full: "Monday" },
  { short: "T", full: "Tuesday" },
  { short: "W", full: "Wednesday" },
  { short: "T", full: "Thursday" },
  { short: "F", full: "Friday" },
  { short: "S", full: "Saturday" },
];

function DayToggles({
  selected,
  onToggle,
  size = "sm",
}: {
  selected: number[];
  onToggle: (day: number) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-1">
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
              "grid place-items-center rounded-full text-xs font-semibold transition-colors",
              size === "md" ? "size-9" : "size-7",
              on
                ? "bg-workouts text-white"
                : "bg-surface-sunk text-ink-faint hover:text-ink"
            )}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The weekly split — "Monday legs, Tuesday arms" — stored as one rule per
 * workout with the days it runs on. The calendar reads the same rules, so
 * anything set here shows up there as a planned occurrence automatically.
 */
export function WeeklySplit() {
  const rules = useQuery(api.recurrences.list);
  const create = useMutation(api.recurrences.create);
  const setDays = useMutation(api.recurrences.setDays);
  const remove = useMutation(api.recurrences.remove);

  const [name, setName] = useState("");
  const [days, setDays_] = useState<number[]>([]);

  const workoutRules = (rules ?? []).filter((r) => r.tool === "workouts");
  const todayWeekday = fromDateKey(todayKey()).getDay();

  const toggleDraft = (day: number) =>
    setDays_((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    );

  return (
    <Card className="space-y-4 p-5">
      <CardHead
        label="Weekly split"
        icon={CalendarSync}
        accent="var(--tool-workouts)"
        trailing={
          workoutRules.length > 0 ? (
            <span className="text-xs text-ink-faint">shows on the calendar</span>
          ) : null
        }
      />

      {rules === undefined ? (
        <Skeleton className="h-24 w-full rounded-tile" />
      ) : (
        <>
          {/* Week overview — the thing you actually want to glance at. */}
          {workoutRules.length > 0 ? (
            <ul className="grid grid-cols-7 gap-1">
              {DAYS.map((day, index) => {
                const planned = workoutRules.filter((r) => r.byDay.includes(index));
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
          ) : null}

          {workoutRules.length > 0 ? (
            <ul className="space-y-2">
              {workoutRules.map((rule) => (
                <li
                  key={rule._id}
                  className="flex flex-wrap items-center gap-2 rounded-tile bg-surface-sunk px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 basis-24 truncate text-sm font-medium">
                    {rule.title}
                  </span>
                  <DayToggles
                    selected={rule.byDay}
                    onToggle={(day) => {
                      const next = rule.byDay.includes(day)
                        ? rule.byDay.filter((d) => d !== day)
                        : [...rule.byDay, day];
                      void setDays({ recurrenceId: rule._id, byDay: next });
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${rule.title}`}
                    onClick={async () => {
                      await remove({ recurrenceId: rule._id });
                      toast(`${rule.title} removed from the split`);
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">
              Set up the days you train — legs on Monday, arms on Tuesday — and each one shows on
              the calendar every week, ready to start with one tap.
            </p>
          )}

          <form
            className="space-y-2 border-t border-line pt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || days.length === 0) return;
              try {
                await create({
                  tool: "workouts",
                  title: name,
                  byDay: days,
                  startsOn: todayKey(),
                });
                setName("");
                setDays_([]);
                toast.success(`${name} added to the split`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not add that");
              }
            }}
          >
            <Input
              placeholder="Legs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DayToggles selected={days} onToggle={toggleDraft} size="md" />
              <Button
                type="submit"
                size="sm"
                disabled={!name.trim() || days.length === 0}
                className="shrink-0"
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
}
