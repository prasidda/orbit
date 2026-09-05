"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Clock, Dumbbell, Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { todayKey, formatDayShort, fromDateKey } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HistoryChart, RangePicker, useHistoryRange } from "@/components/history-chart";
import { DAYS, DayToggles, describeDays } from "./day-toggles";
import { cn } from "@/lib/utils";

const ACCENT = "var(--tool-workouts)";

const sessionHref = (id: Id<"workouts">) => `/workouts/${id}` as Route;

/**
 * One dialog for both halves of the same thought: what the session is, and
 * which days it happens. Leave the days blank and it's a one-off today.
 */
function NewSession({ date }: { date: string }) {
  const create = useMutation(api.workouts.create);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);

  const weekday = fromDateKey(date).getDay();
  const landsToday = days.length === 0 || days.includes(weekday);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0">
          <Plus className="size-4" />
          Session
        </Button>
      </DialogTrigger>
      <DialogContent title="New session" description="Name it, then pick the days it repeats.">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || saving) return;
            setSaving(true);
            try {
              // Always create today's row so there's somewhere to put
              // exercises straight away, even if the schedule starts later.
              const id = await create({ date, name, repeatDays: days, startNow: true });
              setName("");
              setDays([]);
              setOpen(false);
              if (id) router.push(sessionHref(id));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save that");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Input
            autoFocus
            placeholder="Legs"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="space-y-2 rounded-tile bg-surface-sunk px-3 py-2.5">
            <p className="text-sm font-medium">Repeats on</p>
            <DayToggles
              size="md"
              selected={days}
              onToggle={(day) =>
                setDays((current) =>
                  current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
                )
              }
            />
            <p className="text-xs text-ink-faint">
              {days.length === 0
                ? "Doesn't repeat — just today."
                : landsToday
                  ? `${describeDays(days)}.`
                  : `${describeDays(days)}, and you can fill it in now.`}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {saving ? "Creating…" : "Create and open"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A row in the overview. Tapping it opens the session's own page. */
function SessionRow({
  title,
  detail,
  href,
  onStart,
  starting,
}: {
  title: string;
  detail: string;
  href?: Route;
  onStart?: () => void;
  starting?: boolean;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-ink-faint">{detail}</p>
      </div>
      {onStart ? (
        <Button size="sm" disabled={starting} onClick={onStart}>
          {starting ? "Starting…" : "Start"}
        </Button>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-ink-faint" />
      )}
    </>
  );

  const className =
    "flex w-full items-center gap-3 rounded-tile bg-surface-sunk px-3 py-3 text-left transition-colors hover:bg-[color:var(--surface)]";

  if (href && !onStart) {
    return (
      <li>
        <Link href={href} className={className}>
          {body}
        </Link>
      </li>
    );
  }
  return <li className={className}>{body}</li>;
}

function TodayCard({ date }: { date: string }) {
  const today = useQuery(api.workouts.day, { date });
  const rules = useQuery(api.recurrences.list);
  const create = useMutation(api.workouts.create);
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);

  const weekday = fromDateKey(date).getDay();
  const logged = today ?? [];
  const loggedNames = new Set(logged.map((w) => w.name.toLowerCase()));
  const planned = (rules ?? []).filter(
    (rule) =>
      rule.tool === "workouts" &&
      rule.byDay.includes(weekday) &&
      !loggedNames.has(rule.title.toLowerCase())
  );

  if (today === undefined) return <Skeleton className="h-32 w-full rounded-card" />;

  if (logged.length === 0 && planned.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState
          icon={Dumbbell}
          title="Nothing on for today"
          body="Add a session and pick the days it repeats. Open it any time to fill in what you did."
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-5">
      <CardHead label="Today" icon={Dumbbell} accent={ACCENT} />
      <ul className="space-y-2">
        {planned.map((rule) => (
          <SessionRow
            key={rule._id}
            title={rule.title}
            detail="on your schedule for today"
            starting={starting === rule._id}
            onStart={async () => {
              setStarting(rule._id);
              try {
                // copyLast brings the exercises across, so a weekly session
                // doesn't start from an empty list every time.
                const id = await create({
                  date,
                  name: rule.title,
                  startNow: true,
                  copyLast: true,
                });
                if (id) router.push(sessionHref(id));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not start that");
              } finally {
                setStarting(null);
              }
            }}
          />
        ))}

        {logged.map((workout) => (
          <SessionRow
            key={workout._id}
            title={workout.name}
            href={sessionHref(workout._id)}
            detail={
              [
                `${workout.sets.length} set${workout.sets.length === 1 ? "" : "s"}`,
                workout.volume > 0 ? `${workout.volume.toLocaleString()} lb` : null,
                workout.timeSec > 0 ? formatDuration(workout.timeSec) : null,
                workout.durationMin ? `${workout.durationMin} min` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "nothing logged yet"
            }
          />
        ))}
      </ul>
    </Card>
  );
}

/** The week at a glance, plus a way into every session you have. */
function SessionList() {
  const sessions = useQuery(api.workouts.sessionIndex);
  const todayWeekday = fromDateKey(todayKey()).getDay();

  if (sessions === undefined) return <Skeleton className="h-40 w-full rounded-card" />;
  if (sessions.length === 0) return null;

  const repeating = sessions.filter((s) => s.byDay.length > 0);

  return (
    <Card className="space-y-4 p-5">
      <CardHead label="Your sessions" icon={Dumbbell} accent={ACCENT} />

      {repeating.length > 0 ? (
        <ul className="grid grid-cols-7 gap-1">
          {DAYS.map((day, index) => {
            const onThisDay = repeating.filter((s) => s.byDay.includes(index));
            const isToday = index === todayWeekday;
            return (
              <li
                key={index}
                className={cn(
                  "min-h-14 rounded-tile px-1 py-1.5 text-center",
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
                  {onThisDay.length === 0 ? (
                    <span className="text-[0.625rem] text-ink-faint">rest</span>
                  ) : (
                    onThisDay.map((s) => (
                      <p
                        key={s.name}
                        title={s.name}
                        className="truncate text-[0.625rem] font-medium leading-tight"
                      >
                        {s.name}
                      </p>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ul className="space-y-2">
        {sessions.map((session) =>
          session.lastWorkoutId ? (
            <SessionRow
              key={session.name}
              title={session.name}
              href={sessionHref(session.lastWorkoutId)}
              detail={[
                session.byDay.length > 0 ? describeDays(session.byDay) : "doesn't repeat",
                session.lastDate ? `last ${formatDayShort(session.lastDate)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : (
            <li
              key={session.name}
              className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{session.name}</p>
                <p className="truncate text-xs text-ink-faint">
                  {describeDays(session.byDay)} · not done yet
                </p>
              </div>
            </li>
          )
        )}
      </ul>
    </Card>
  );
}

function WorkoutHistory() {
  const { days, setDays, from, to } = useHistoryRange(14);
  const history = useQuery(api.workouts.minutesByDay, { from, to });

  return (
    <Card className="space-y-4 p-5">
      <CardHead
        label="Minutes trained"
        icon={Clock}
        accent={ACCENT}
        trailing={<RangePicker days={days} onChange={setDays} />}
      />

      {history === undefined ? (
        <Skeleton className="h-36 w-full rounded-tile" />
      ) : (
        <>
          <HistoryChart
            data={history.days.map((d) => ({ date: d.date, value: d.minutes }))}
            from={from}
            to={to}
            accent={ACCENT}
            formatValue={(min) => `${min} min`}
            emptyLabel="No timed sessions in this stretch — open a session and add its minutes."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              {history.sessionCount} session{history.sessionCount === 1 ? "" : "s"}
            </Badge>
            <Badge tone="neutral">
              <Timer className="size-3" />
              {history.days.reduce((sum, d) => sum + d.minutes, 0)} min
            </Badge>
          </div>
        </>
      )}
    </Card>
  );
}

export function WorkoutsView() {
  const date = todayKey();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="eyebrow">Workouts</p>
          <h1 className="font-display text-3xl sm:text-4xl">Training</h1>
        </div>
        <NewSession date={date} />
      </header>

      <TodayCard date={date} />
      <SessionList />
      <WorkoutHistory />
    </div>
  );
}
