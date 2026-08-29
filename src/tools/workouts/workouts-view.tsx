"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Clock, Dumbbell, Play, Plus, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { todayKey, shiftKey, formatDayShort, fromDateKey } from "@/lib/dates";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HistoryChart, RangePicker, useHistoryRange } from "@/components/history-chart";
import { SetForm } from "./set-form";
import { formatDuration } from "@/lib/duration";
import { DayToggles, describeDays } from "./day-toggles";
import { SessionSchedule } from "./session-schedule";

const ACCENT = "var(--tool-workouts)";

type SetRow = {
  _id: Id<"workoutSets">;
  exercise: string;
  kind?: "reps" | "time";
  reps?: number;
  weight?: number;
  unit?: string;
  durationSec?: number;
};

/** Minutes for the session — the number the history chart is built from. */
function DurationField({
  workoutId,
  durationMin,
}: {
  workoutId: Id<"workouts">;
  durationMin?: number;
}) {
  const setDuration = useMutation(api.workouts.setDuration);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = async () => {
    if (draft === null) return;
    const minutes = Number(draft);
    setDraft(null);
    if (!Number.isFinite(minutes) || minutes < 0) return;
    await setDuration({ workoutId, durationMin: minutes });
  };

  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-faint">
      <Clock className="size-3.5" />
      <input
        inputMode="numeric"
        placeholder="—"
        value={draft ?? (durationMin !== undefined ? String(durationMin) : "")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-10 rounded-md bg-transparent text-center text-base text-ink outline-none focus:bg-surface-sunk sm:text-xs"
      />
      min
    </label>
  );
}

function setLabel(set: SetRow): string {
  if (set.kind === "time") return formatDuration(set.durationSec ?? 0);
  return `${set.reps ?? 0} × ${set.weight ?? 0}${set.unit ?? "lb"}`;
}

function WorkoutCard({
  workout,
}: {
  workout: {
    _id: Id<"workouts">;
    name: string;
    date: string;
    volume: number;
    timeSec: number;
    durationMin?: number;
    sets: SetRow[];
  };
}) {
  const removeSet = useMutation(api.workouts.removeSet);
  const removeWorkout = useMutation(api.workouts.remove);

  return (
    <Card className="space-y-3 p-5">
      <CardHead
        label={workout.name}
        icon={Dumbbell}
        accent={ACCENT}
        trailing={
          <div className="flex items-center gap-2">
            <DurationField workoutId={workout._id} durationMin={workout.durationMin} />
            <button
              type="button"
              aria-label="Delete session"
              onClick={async () => {
                await removeWorkout({ workoutId: workout._id });
                toast("Session deleted");
              }}
              className="grid size-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {workout.volume > 0 ? (
          <Badge tone="terracotta">{workout.volume.toLocaleString()} lb volume</Badge>
        ) : null}
        {workout.timeSec > 0 ? (
          <Badge tone="sage">
            <Timer className="size-3" />
            {formatDuration(workout.timeSec)}
          </Badge>
        ) : null}
      </div>

      {workout.sets.length === 0 ? (
        <p className="text-sm text-ink-muted">No sets yet — add the first one below.</p>
      ) : (
        <ul className="space-y-1.5">
          {workout.sets.map((set, i) => (
            <li
              key={set._id}
              className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2"
            >
              <span className="w-5 shrink-0 text-xs font-semibold text-ink-faint">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{set.exercise}</span>
              <span className="flex shrink-0 items-center gap-1 text-sm text-ink-muted">
                {set.kind === "time" ? <Timer className="size-3 text-ink-faint" /> : null}
                {setLabel(set)}
              </span>
              <button
                type="button"
                aria-label="Remove set"
                onClick={() => removeSet({ setId: set._id })}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SetForm workoutId={workout._id} />
    </Card>
  );
}

/**
 * One dialog for both halves of the same thought: what the session is, and
 * which days it happens. Leave the days blank and it's a one-off today.
 */
function NewSession({ date }: { date: string }) {
  const create = useMutation(api.workouts.create);
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
              await create({ date, name, repeatDays: days });
              setName("");
              setDays([]);
              setOpen(false);
              toast.success(
                days.length === 0
                  ? "Session started"
                  : landsToday
                    ? "Session started, and it repeats"
                    : "Added to your week"
              );
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
                ? "No days picked — just a one-off today."
                : landsToday
                  ? `${describeDays(days)} — starting today.`
                  : `${describeDays(days)} — nothing logged today.`}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : days.length === 0 ? "Start" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A scheduled session you haven't started — one tap makes it real. */
function PlannedRow({ date, title }: { date: string; title: string }) {
  const create = useMutation(api.workouts.create);
  const [starting, setStarting] = useState(false);

  return (
    <Card className="flex items-center gap-3 p-4">
      <Play className="size-4 shrink-0" style={{ color: ACCENT }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="text-xs text-ink-faint">on your schedule for today</p>
      </div>
      <Button
        size="sm"
        disabled={starting}
        onClick={async () => {
          setStarting(true);
          try {
            // startNow because the rule already exists; this only adds the row.
            await create({ date, name: title, startNow: true });
            toast.success(`${title} started`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not start that");
          } finally {
            setStarting(false);
          }
        }}
      >
        {starting ? "Starting…" : "Start"}
      </Button>
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
            emptyLabel="No timed sessions in this stretch — add minutes to a session and it'll show here."
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              {history.sessionCount} session{history.sessionCount === 1 ? "" : "s"}
            </Badge>
            <Badge tone="neutral">
              {history.days.reduce((sum, d) => sum + d.minutes, 0)} min total
            </Badge>
            {history.untimed > 0 ? (
              <Badge tone="outline">{history.untimed} without minutes</Badge>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}

export function WorkoutsView() {
  const date = todayKey();
  const today = useQuery(api.workouts.day, { date });
  const rules = useQuery(api.recurrences.list);
  const recent = useQuery(api.workouts.history, {
    from: shiftKey(date, -30),
    to: shiftKey(date, -1),
  });

  const weekday = fromDateKey(date).getDay();
  const started = new Set((today ?? []).map((w) => w.name.toLowerCase()));
  const plannedToday = (rules ?? []).filter(
    (rule) =>
      rule.tool === "workouts" &&
      rule.byDay.includes(weekday) &&
      !started.has(rule.title.toLowerCase())
  );

  const nothingToday = today !== undefined && today.length === 0 && plannedToday.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="eyebrow">Workouts</p>
          <h1 className="font-display text-3xl sm:text-4xl">Today&rsquo;s training</h1>
        </div>
        <NewSession date={date} />
      </header>

      {today === undefined ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : nothingToday ? (
        <Card className="p-2">
          <EmptyState
            icon={Dumbbell}
            title="Nothing on for today"
            body="Add a session and pick the days it repeats — reps and weight, or a time for anything you hold or run."
          />
        </Card>
      ) : (
        <>
          {plannedToday.map((rule) => (
            <PlannedRow key={rule._id} date={date} title={rule.title} />
          ))}
          {today.map((workout) => (
            <WorkoutCard key={workout._id} workout={workout} />
          ))}
        </>
      )}

      <SessionSchedule />

      <WorkoutHistory />

      {recent && recent.length > 0 ? (
        <Card className="space-y-3 p-5">
          <CardHead label="Recent sessions" icon={Dumbbell} accent={ACCENT} />
          <ul className="divide-y divide-line">
            {recent.slice(0, 10).map((workout) => (
              <li key={workout._id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{workout.name}</span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {workout.sets.length} sets
                  {workout.durationMin ? ` · ${workout.durationMin} min` : ""} ·{" "}
                  {formatDayShort(workout.date)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
