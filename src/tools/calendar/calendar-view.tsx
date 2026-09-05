"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { addMonths, format, isSameMonth, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  monthGrid,
  monthBounds,
  toDateKey,
  todayKey,
  fromDateKey,
  formatDayLong,
} from "@/lib/dates";
import { TOOL_BY_KEY, TOOLS } from "@/tools/registry";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DayPanel } from "./day-panel";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function AddEvent({ date }: { date: string }) {
  const addEvent = useMutation(api.calendar.addEvent);
  const addRecurrence = useMutation(api.recurrences.create);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [repeat, setRepeat] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Event
        </Button>
      </DialogTrigger>
      <DialogContent title="New event" description={formatDayLong(date)}>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim() || saving) return;
            setSaving(true);
            const startMin = time
              ? Number(time.split(":")[0]) * 60 + Number(time.split(":")[1])
              : undefined;
            try {
              await addEvent({ title, date, startMin, location: location || undefined });
              if (repeat) {
                await addRecurrence({
                  tool: "calendar",
                  title,
                  byDay: [fromDateKey(date).getDay()],
                  startsOn: date,
                  startMin,
                  location: location || undefined,
                });
              }
              setTitle("");
              setTime("");
              setLocation("");
              setRepeat(false);
              setOpen(false);
              toast.success("Added");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not add that");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Title">
            <Input
              autoFocus
              placeholder="CS 3520 lecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Where">
              <Input
                placeholder="Snell 108"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-tile bg-surface-sunk px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Repeat weekly</span>
              <span className="block text-xs text-ink-faint">
                Every {format(fromDateKey(date), "EEEE")} from here on.
              </span>
            </span>
            <Switch checked={repeat} onCheckedChange={setRepeat} />
          </label>

          <Button type="submit" className="w-full" disabled={saving || !title.trim()}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayKey());

  const days = useMemo(() => monthGrid(month), [month]);
  const bounds = useMemo(() => monthBounds(month), [month]);
  const items = useQuery(api.calendar.range, bounds);

  // One pass into a per-day bucket, so each cell is a map lookup.
  const byDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof items>>();
    for (const item of items ?? []) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startMin ?? 1441) - (b.startMin ?? 1441));
    }
    return map;
  }, [items]);

  const today = todayKey();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Stacked on phones: "September 2026" plus three controls doesn't fit
          on one line in portrait, and truncating clipped the month name. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="eyebrow">Calendar</p>
          <h1 className="font-display text-3xl sm:text-4xl">{format(month, "MMMM yyyy")}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setMonth(startOfMonth(new Date()));
              setSelected(todayKey());
            }}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* The grid stays compact on phones so the day panel is reachable
            without scrolling — tapping a date is the main interaction. */}
        <Card className="p-2 sm:p-3">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((label, i) => (
              <div
                key={i}
                className="pb-1.5 text-center text-[0.625rem] font-semibold text-ink-faint"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map((day) => {
              const key = toDateKey(day);
              const dayItems = byDate.get(key) ?? [];
              const outside = !isSameMonth(day, month);
              const isToday = key === today;
              const isSelected = key === selected;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={cn(
                    "flex min-h-11 flex-col items-center gap-1 rounded-tile px-0.5 py-1.5 transition-colors sm:min-h-16 sm:justify-start",
                    isSelected ? "bg-terracotta-soft" : "hover:bg-surface-sunk",
                    outside && "opacity-35"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs",
                      isToday
                        ? "bg-terracotta font-bold text-white"
                        : isSelected
                          ? "font-bold text-terracotta-ink"
                          : "text-ink-muted"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  <span className="flex min-h-2 flex-wrap items-center justify-center gap-0.5">
                    {dayItems.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        title={item.title}
                        className={cn(
                          "size-1.5 rounded-full",
                          // Planned repeats read as outlines; real things are solid.
                          item.planned && "bg-transparent ring-1 ring-inset",
                          item.done && item.tool === "classwork" && "opacity-40"
                        )}
                        style={
                          item.planned
                            ? { color: TOOL_BY_KEY[item.tool].accent }
                            : { background: TOOL_BY_KEY[item.tool].accent }
                        }
                      />
                    ))}
                    {dayItems.length > 4 ? (
                      <span className="text-[0.5rem] leading-none text-ink-faint">
                        +{dayItems.length - 4}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Without this the dots are just coloured specks. */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-line pt-2">
            {TOOLS.map((tool) => (
              <span key={tool.key} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: tool.accent }} />
                <span className="text-[0.625rem] text-ink-faint">{tool.label}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full ring-1 ring-inset ring-ink-faint" />
              <span className="text-[0.625rem] text-ink-faint">planned</span>
            </span>
          </div>
        </Card>

        <Card className="space-y-3 p-4 sm:p-5">
          <CardHead
            label={formatDayLong(selected)}
            icon={CalendarDays}
            accent="var(--tool-calendar)"
            trailing={<AddEvent date={selected} />}
          />
          <DayPanel date={selected} />
        </Card>
      </div>
    </div>
  );
}
