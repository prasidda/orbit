"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { todayKey, shiftKey, formatDayShort } from "@/lib/dates";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";

const ACCENT = "var(--tool-workouts)";

function SetForm({ workoutId }: { workoutId: Id<"workouts"> }) {
  const addSet = useMutation(api.workouts.addSet);
  const suggestions = useQuery(api.workouts.exercises);
  const [exercise, setExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!exercise.trim()) return;
        await addSet({
          workoutId,
          exercise,
          reps: Number(reps) || 1,
          weight: Number(weight) || 0,
          unit: "lb",
        });
        // Keep the exercise so logging set after set is one field, not three.
        setReps("");
        setWeight("");
      }}
    >
      <Input
        list="exercise-suggestions"
        placeholder="Exercise"
        value={exercise}
        onChange={(e) => setExercise(e.target.value)}
        className="h-9 min-w-0 flex-[2] basis-40"
      />
      <datalist id="exercise-suggestions">
        {(suggestions ?? []).map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Input
        inputMode="numeric"
        placeholder="Reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="h-9 min-w-0 flex-1 basis-20"
      />
      <Input
        inputMode="decimal"
        placeholder="lb"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="h-9 min-w-0 flex-1 basis-20"
      />
      <Button type="submit" size="icon-sm" aria-label="Add set">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

function WorkoutCard({
  workout,
}: {
  workout: {
    _id: Id<"workouts">;
    name: string;
    date: string;
    volume: number;
    sets: {
      _id: Id<"workoutSets">;
      exercise: string;
      reps: number;
      weight: number;
      unit: string;
    }[];
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
            {workout.volume > 0 ? (
              <Badge tone="terracotta">{workout.volume.toLocaleString()} lb volume</Badge>
            ) : null}
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
              <span className="shrink-0 text-sm text-ink-muted">
                {set.reps} × {set.weight}
                {set.unit}
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

export function WorkoutsView() {
  const date = todayKey();
  const today = useQuery(api.workouts.day, { date });
  const history = useQuery(api.workouts.history, { from: shiftKey(date, -30), to: shiftKey(date, -1) });
  const create = useMutation(api.workouts.create);
  const [name, setName] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Workouts</p>
          <h1 className="font-display text-4xl">Today&rsquo;s training</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Session
            </Button>
          </DialogTrigger>
          <DialogContent title="New session" description="Name it however you think about it.">
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                await create({ date, name });
                setName("");
                toast.success("Session started");
              }}
            >
              <Input
                autoFocus
                placeholder="Push day"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <DialogClose asChild>
                <Button type="submit">Start</Button>
              </DialogClose>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {today === undefined ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : today.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Dumbbell}
            title="Nothing logged today"
            body="Start a session and add sets as you go. Exercise names autocomplete from your own history."
          />
        </Card>
      ) : (
        today.map((workout) => <WorkoutCard key={workout._id} workout={workout} />)
      )}

      {history && history.length > 0 ? (
        <Card className="space-y-3 p-5">
          <CardHead label="Recent sessions" icon={Dumbbell} accent={ACCENT} />
          <ul className="divide-y divide-line">
            {history.slice(0, 10).map((workout) => (
              <li key={workout._id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{workout.name}</span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {workout.sets.length} sets · {formatDayShort(workout.date)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
