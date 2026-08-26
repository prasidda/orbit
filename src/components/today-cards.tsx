"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { BookOpen, CalendarDays, Dumbbell } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { todayKey } from "@/lib/dates";
import { TOOL_BY_KEY } from "@/tools/registry";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";

/** Today's training, or a nudge to start one. */
export function WorkoutsTodayCard({ date }: { date: string }) {
  const today = useQuery(api.workouts.day, { date });
  const tool = TOOL_BY_KEY.workouts;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardHead label="Workouts" icon={Dumbbell} accent={tool.accent} />

      {today === undefined ? (
        <Skeleton className="h-16 w-full rounded-tile" />
      ) : today.length === 0 ? (
        <>
          <p className="text-sm text-ink-muted">Nothing logged yet today.</p>
          <Button asChild size="sm" className="mt-auto w-fit">
            <Link href={tool.href}>Start a session</Link>
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <p className="font-display text-2xl leading-tight">{today[0].name}</p>
            <p className="text-sm text-ink-muted">
              {today[0].sets.length} set{today[0].sets.length === 1 ? "" : "s"}
              {today[0].volume > 0 ? ` · ${today[0].volume.toLocaleString()} lb` : ""}
            </p>
          </div>
          <Button asChild size="sm" variant="secondary" className="mt-auto w-fit">
            <Link href={tool.href}>Add sets</Link>
          </Button>
        </>
      )}
    </Card>
  );
}

/** What's due, weighted toward what's late. */
export function ClassworkTodayCard() {
  const assignments = useQuery(api.classwork.assignments);
  const tool = TOOL_BY_KEY.classwork;
  const today = todayKey();

  const open = (assignments ?? []).filter((a) => a.status !== "done");
  const overdue = open.filter((a) => a.date < today);
  const dueToday = open.filter((a) => a.date === today);
  const upcoming = [...overdue, ...dueToday, ...open.filter((a) => a.date > today)].slice(0, 3);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardHead
        label="Classwork"
        icon={BookOpen}
        accent={tool.accent}
        trailing={
          overdue.length > 0 ? (
            <Badge tone="danger">{overdue.length} overdue</Badge>
          ) : dueToday.length > 0 ? (
            <Badge tone="terracotta">{dueToday.length} today</Badge>
          ) : null
        }
      />

      {assignments === undefined ? (
        <Skeleton className="h-16 w-full rounded-tile" />
      ) : upcoming.length === 0 ? (
        <>
          <p className="text-sm text-ink-muted">Nothing outstanding.</p>
          <Button asChild size="sm" variant="secondary" className="mt-auto w-fit">
            <Link href={tool.href}>Add an assignment</Link>
          </Button>
        </>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.map((item) => (
            <li key={item._id} className="flex items-center gap-2 text-sm">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: item.course?.color ?? tool.accent }}
              />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <span className="shrink-0 text-xs text-ink-faint">
                {item.date < today
                  ? "late"
                  : item.date === today
                    ? "today"
                    : format(new Date(`${item.date}T00:00:00`), "EEE")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The next thing on the clock. */
export function NextUpCard({ date }: { date: string }) {
  const items = useQuery(api.calendar.range, { from: date, to: date });
  const tool = TOOL_BY_KEY.calendar;

  const timed = (items ?? [])
    .filter((i) => i.startMin !== undefined)
    .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));
  const next = timed[0];

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardHead label="Next up" icon={CalendarDays} accent={tool.accent} />

      {items === undefined ? (
        <Skeleton className="h-16 w-full rounded-tile" />
      ) : next ? (
        <>
          <div className="space-y-0.5">
            <p className="font-display text-2xl leading-tight">
              {format(
                new Date(2000, 0, 1, Math.floor((next.startMin ?? 0) / 60), (next.startMin ?? 0) % 60),
                "h:mm a"
              )}
            </p>
            <p className="truncate text-sm font-medium">{next.title}</p>
            {next.detail ? <p className="truncate text-xs text-ink-faint">{next.detail}</p> : null}
          </div>
          <Button asChild size="sm" variant="secondary" className="mt-auto w-fit">
            <Link href={tool.href}>See the day</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">Nothing scheduled today.</p>
          <Button asChild size="sm" variant="secondary" className="mt-auto w-fit">
            <Link href={tool.href}>Open calendar</Link>
          </Button>
        </>
      )}
    </Card>
  );
}
