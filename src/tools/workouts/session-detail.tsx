"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Clock, Repeat, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDayLong } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { SetForm } from "./set-form";
import { DayToggles, describeDays } from "./day-toggles";

const ACCENT = "var(--tool-workouts)";

/**
 * Everything about one session, on its own page.
 *
 * The overview stays a list; this is where a session is actually changed —
 * its name, its exercises, how long it took, and which days it repeats.
 */
export function SessionDetail({ workoutId }: { workoutId: Id<"workouts"> }) {
  const router = useRouter();
  const session = useQuery(api.workouts.get, { workoutId });
  const rename = useMutation(api.workouts.rename);
  const setDuration = useMutation(api.workouts.setDuration);
  const setSchedule = useMutation(api.workouts.setSchedule);
  const removeSet = useMutation(api.workouts.removeSet);
  const removeWorkout = useMutation(api.workouts.remove);

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [durationDraft, setDurationDraft] = useState<string | null>(null);

  if (session === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <p className="font-display text-2xl">That session is gone</p>
        <Button asChild variant="secondary" size="sm">
          <Link href={"/workouts" as Route}>Back to workouts</Link>
        </Button>
      </div>
    );
  }

  const byDay = session.schedule?.byDay ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={"/workouts" as Route}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Workouts
      </Link>

      <header className="space-y-1">
        <p className="eyebrow">{formatDayLong(session.date)}</p>
        <input
          value={nameDraft ?? session.name}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={async () => {
            if (nameDraft === null) return;
            const next = nameDraft.trim();
            setNameDraft(null);
            if (!next || next === session.name) return;
            await rename({ workoutId, name: next });
            toast.success("Renamed");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Session name"
          className="w-full rounded-tile bg-transparent font-display text-3xl text-ink outline-none focus:bg-surface-sunk sm:text-4xl"
        />
      </header>

      <div className="flex flex-wrap gap-2">
        {session.volume > 0 ? (
          <Badge tone="terracotta">{session.volume.toLocaleString()} lb volume</Badge>
        ) : null}
        {session.timeSec > 0 ? (
          <Badge tone="sage">
            <Timer className="size-3" />
            {formatDuration(session.timeSec)}
          </Badge>
        ) : null}
        <Badge tone="neutral">
          {session.sets.length} set{session.sets.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <Card className="space-y-3 p-5">
        <CardHead label="Exercises" accent={ACCENT} />

        {session.sets.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing yet. Add reps and weight, or a time for anything you hold or run.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {session.sets.map((set, i) => (
              <li
                key={set._id}
                className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2"
              >
                <span className="w-5 shrink-0 text-xs font-semibold text-ink-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{set.exercise}</span>
                <span className="flex shrink-0 items-center gap-1 text-sm text-ink-muted">
                  {set.kind === "time" ? <Timer className="size-3 text-ink-faint" /> : null}
                  {set.kind === "time"
                    ? formatDuration(set.durationSec ?? 0)
                    : `${set.reps ?? 0} × ${set.weight ?? 0}${set.unit ?? "lb"}`}
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

        <SetForm workoutId={workoutId} />
      </Card>

      <Card className="space-y-3 p-5">
        <CardHead label="How long" icon={Clock} accent={ACCENT} />
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="45"
            value={durationDraft ?? (session.durationMin !== undefined ? String(session.durationMin) : "")}
            onChange={(e) => setDurationDraft(e.target.value)}
            onBlur={async () => {
              if (durationDraft === null) return;
              const minutes = Number(durationDraft);
              setDurationDraft(null);
              if (!Number.isFinite(minutes) || minutes < 0) return;
              await setDuration({ workoutId, durationMin: minutes });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-28"
          />
          <span className="text-sm text-ink-muted">minutes</span>
        </div>
        <p className="text-xs text-ink-faint">Feeds the minutes-trained chart on the overview.</p>
      </Card>

      <Card className="space-y-3 p-5">
        <CardHead label="Repeats" icon={Repeat} accent={ACCENT} />
        <DayToggles
          size="md"
          selected={byDay}
          onToggle={(day) => {
            const next = byDay.includes(day) ? byDay.filter((d) => d !== day) : [...byDay, day];
            void setSchedule({ workoutId, byDay: next });
          }}
        />
        <p className="text-xs text-ink-faint">
          {byDay.length === 0
            ? "Doesn't repeat — pick days and it lands on your calendar every week."
            : `${describeDays(byDay)}. Starting it carries these exercises over.`}
        </p>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Delete this session</p>
          <p className="text-xs text-ink-faint">
            Removes this day only. {byDay.length > 0 ? "The weekly repeat stays." : ""}
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            await removeWorkout({ workoutId });
            toast("Session deleted");
            router.push("/workouts" as Route);
          }}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </Card>
    </div>
  );
}
