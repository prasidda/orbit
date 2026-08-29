"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { addMonths, format, isSameMonth, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { monthGrid, monthBounds, toDateKey, todayKey, formatDayLong } from "@/lib/dates";
import { TOOL_BY_KEY } from "@/tools/registry";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function minutesToLabel(min?: number) {
  if (min === undefined) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}

function AddEvent({ date }: { date: string }) {
  const addEvent = useMutation(api.calendar.addEvent);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

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
            const [h, m] = time ? time.split(":").map(Number) : [];
            try {
              await addEvent({
                title,
                date,
                startMin: time ? h * 60 + m : undefined,
                location: location || undefined,
              });
              setTitle("");
              setTime("");
              setLocation("");
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
  const removeEvent = useMutation(api.calendar.removeEvent);

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

  const selectedItems = byDate.get(selected) ?? [];
  const today = todayKey();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Calendar</p>
          <h1 className="font-display text-4xl">{format(month, "MMMM yyyy")}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
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

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden p-2 sm:p-3">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((label, i) => (
              <div key={i} className="pb-2 text-center text-[0.6875rem] font-semibold text-ink-faint">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
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
                    "flex min-h-16 flex-col items-start gap-1 rounded-tile p-1.5 text-left transition-colors sm:min-h-20 sm:p-2",
                    isSelected ? "bg-terracotta-soft" : "hover:bg-surface-sunk",
                    outside && "opacity-40"
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

                  <span className="flex w-full flex-wrap gap-0.5">
                    {dayItems.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        title={item.title}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          item.done && item.tool === "classwork" && "opacity-40"
                        )}
                        style={{ background: TOOL_BY_KEY[item.tool].accent }}
                      />
                    ))}
                    {dayItems.length > 4 ? (
                      <span className="text-[0.5625rem] leading-none text-ink-faint">
                        +{dayItems.length - 4}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <CardHead
            label={formatDayLong(selected)}
            icon={CalendarDays}
            accent="var(--tool-calendar)"
            trailing={<AddEvent date={selected} />}
          />

          {selectedItems.length === 0 ? (
            <EmptyState title="Nothing on" body="A clear day. Add an event, or enjoy it." />
          ) : (
            <ul className="space-y-1.5">
              {selectedItems.map((item) => {
                const tool = TOOL_BY_KEY[item.tool];
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-tile bg-surface-sunk px-3 py-2.5"
                  >
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ background: tool.accent }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          item.done && "text-ink-faint line-through"
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {[minutesToLabel(item.startMin), item.detail, tool.label]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {item.tool === "calendar" ? (
                      <button
                        type="button"
                        aria-label="Delete event"
                        onClick={() =>
                          removeEvent({ eventId: item.id as Parameters<typeof removeEvent>[0]["eventId"] })
                        }
                        className="text-xs text-ink-faint transition-colors hover:text-danger"
                      >
                        Delete
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
