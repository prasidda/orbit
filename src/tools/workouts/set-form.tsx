"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseDuration } from "@/lib/duration";

type Kind = "reps" | "time";

/**
 * One form, two shapes. Plenty of training isn't reps × weight — planks,
 * treadmill, stretching — and forcing those into a reps field made them
 * unloggable.
 */
export function SetForm({ workoutId }: { workoutId: Id<"workouts"> }) {
  const addSet = useMutation(api.workouts.addSet);
  const suggestions = useQuery(api.workouts.exercises);
  const [kind, setKind] = useState<Kind>("reps");
  const [exercise, setExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [duration, setDuration] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise.trim()) return;

    try {
      if (kind === "time") {
        const durationSec = parseDuration(duration);
        if (durationSec === null) {
          toast.error("Try 90 or 1:30");
          return;
        }
        await addSet({ workoutId, exercise, kind: "time", durationSec });
        setDuration("");
      } else {
        await addSet({
          workoutId,
          exercise,
          kind: "reps",
          reps: Number(reps) || 1,
          weight: Number(weight) || 0,
          unit: "lb",
        });
        // Keep the exercise so set after set is one field, not three.
        setReps("");
        setWeight("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that");
    }
  };

  return (
    <form className="space-y-2" onSubmit={submit}>
      <div className="flex items-center gap-1 self-start rounded-full bg-surface-sunk p-1 w-fit">
        {(["reps", "time"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
              kind === option
                ? "bg-surface text-ink shadow-[0_1px_2px_rgb(43_38_34/0.06)]"
                : "text-ink-faint hover:text-ink"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          list="exercise-suggestions"
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="h-10 min-w-0 flex-[2] basis-40"
        />
        <datalist id="exercise-suggestions">
          {(suggestions ?? []).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {kind === "reps" ? (
          <>
            <Input
              inputMode="numeric"
              placeholder="Reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="h-10 min-w-0 flex-1 basis-20"
            />
            <Input
              inputMode="decimal"
              placeholder="lb"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-10 min-w-0 flex-1 basis-20"
            />
          </>
        ) : (
          <Input
            inputMode="numeric"
            placeholder="1:30 or 90s"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-10 min-w-0 flex-1 basis-28"
          />
        )}

        <Button type="submit" size="icon" aria-label="Add set">
          <Plus className="size-4" />
        </Button>
      </div>
    </form>
  );
}
