import type { Route } from "next";
import type { Matcher } from "@/lib/quick-add/types";
import { parseDuration, formatDuration } from "@/lib/duration";

/**
 * "start legs", "log push day" — creates today's session and opens it.
 * `copyLast` carries the exercises over, matching the Start button.
 */
const START = /^\s*(?:start|begin|log)\s+(.+?)\s*$/i;

/** "bench 3x8 135", "squat 5x5 225", "bench press 3 x 8 @ 135" */
const REPS_SET = new RegExp(
  String.raw`^\s*(.+?)\s+(\d+)\s*x\s*(\d+)(?:\s*(?:@|at)?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?)?\s*$`,
  "i"
);

/** "plank 90s", "plank 1:30", "treadmill 20m" */
const TIME_SET = /^\s*(.+?)\s+(\d+:\d{2}|\d+\s*(?:s|sec|secs|m|min|mins)?)\s*$/i;

function durationFrom(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  // "20m" means twenty minutes; parseDuration reads a bare number as seconds.
  const minutes = /^(\d+)\s*(?:m|min|mins)$/.exec(text);
  if (minutes) return Number(minutes[1]) * 60;
  return parseDuration(text.replace(/\s*(?:s|sec|secs)$/, ""));
}

/**
 * Sets need a session to attach to. With exactly one logged today that's
 * unambiguous; with none or several, quick-add points at the Workouts page
 * rather than guessing which session a set belongs to.
 */
export const workoutMatcher: Matcher = (input, ctx) => {
  const start = START.exec(input);
  if (start) {
    const name = start[1].trim();
    if (!name) return null;
    return {
      tool: "workouts",
      label: `Workouts · start "${name}"`,
      hint: "opens the session",
      run: async (api) => {
        const id = await api.createWorkout({
          date: ctx.today,
          name,
          startNow: true,
          copyLast: true,
        });
        if (id) api.navigate(`/workouts/${id}` as Route);
      },
    };
  }

  const reps = REPS_SET.exec(input);
  if (reps) {
    const exercise = reps[1].trim();
    const sets = Number(reps[2]);
    const count = Number(reps[3]);
    const weight = reps[4] ? Number(reps[4]) : 0;
    if (!exercise || sets < 1 || sets > 20 || count < 1) return null;

    if (ctx.todaysSessions.length !== 1) {
      return {
        tool: "workouts",
        label: `Workouts · ${exercise} ${sets}×${count}`,
        hint:
          ctx.todaysSessions.length === 0
            ? "no session today — opens Workouts"
            : "several sessions today — opens Workouts",
        run: (api) => api.navigate("/workouts" as Route),
      };
    }

    const target = ctx.todaysSessions[0];
    return {
      tool: "workouts",
      label: `${target.name} · ${exercise} ${sets}×${count}${weight ? ` @ ${weight}lb` : ""}`,
      run: async (api) => {
        for (let i = 0; i < sets; i++) {
          await api.addSet({
            workoutId: target.id,
            exercise,
            kind: "reps",
            reps: count,
            weight,
            unit: "lb",
          });
        }
      },
    };
  }

  const timed = TIME_SET.exec(input);
  if (timed) {
    const exercise = timed[1].trim();
    const durationSec = durationFrom(timed[2]);
    if (!exercise || durationSec === null || durationSec <= 0) return null;
    if (ctx.todaysSessions.length !== 1) return null;

    const target = ctx.todaysSessions[0];
    return {
      tool: "workouts",
      label: `${target.name} · ${exercise} ${formatDuration(durationSec)}`,
      run: async (api) => {
        await api.addSet({
          workoutId: target.id,
          exercise,
          kind: "time",
          durationSec,
        });
      },
    };
  }

  return null;
};
