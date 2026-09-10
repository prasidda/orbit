import type { Route } from "next";
import type { ToolKey } from "@/tools/registry";
import type { DateKey } from "@/lib/dates";

/**
 * Quick-add turns a typed phrase into one concrete action.
 *
 * Matchers are pure functions — string plus context in, intent or null out.
 * That is the whole point of doing this deterministically rather than with a
 * model: the parsing can be tested exhaustively, without a browser, a
 * database, or a network call.
 */

/** Everything an intent is allowed to do, injected so matchers stay pure. */
export type QuickAddApi = {
  logWater: (args: { date: DateKey; amountMl: number }) => Promise<unknown>;
  addAssignment: (args: { title: string; date: DateKey }) => Promise<unknown>;
  addEvent: (args: {
    title: string;
    date: DateKey;
    startMin?: number;
  }) => Promise<unknown>;
  createWorkout: (args: {
    date: DateKey;
    name: string;
    startNow: boolean;
    copyLast: boolean;
  }) => Promise<string | null>;
  addSet: (args: {
    workoutId: string;
    exercise: string;
    kind: "reps" | "time";
    reps?: number;
    weight?: number;
    unit?: "kg" | "lb";
    durationSec?: number;
  }) => Promise<unknown>;
  navigate: (href: Route) => void;
};

/**
 * Facts a matcher may need beyond the raw string. Passed in as plain data so
 * a test can construct any situation without mocking hooks.
 */
export type QuickAddContext = {
  today: DateKey;
  /** Sessions already logged today — a set has to attach to one of them. */
  todaysSessions: { id: string; name: string }[];
};

export type QuickAddIntent = {
  tool: ToolKey;
  /** The preview line: "Water · 2 cups · today". */
  label: string;
  /** Optional second line, for caveats like "opens Workouts". */
  hint?: string;
  run: (api: QuickAddApi) => Promise<void> | void;
};

export type Matcher = (input: string, ctx: QuickAddContext) => QuickAddIntent | null;
