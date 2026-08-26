import type { Route } from "next";
import {
  BookOpen,
  CalendarDays,
  Droplet,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";

export type ToolKey = "water" | "workouts" | "classwork" | "calendar";

export type Tool = {
  key: ToolKey;
  label: string;
  href: Route;
  icon: LucideIcon;
  /** CSS token, so the tool's color is identical in nav, card, chart and chips. */
  accent: string;
  tagline: string;
  /** Whether a friend can ever be shown this tool. */
  shareable: boolean;
};

/**
 * ADDING A TOOL
 * -------------
 *  1. add its tables to `convex/schema.ts` (include `userId`, and `date` as
 *     "YYYY-MM-DD" if it happens on a day)
 *  2. write `convex/<key>.ts` — start every function with `requireUser`
 *  3. add a folder under `src/tools/<key>/` with its card + page body
 *  4. add one entry here, and a route at `src/app/(app)/<key>/page.tsx`
 *
 * The sidebar, bottom nav, command palette, settings and sharing all read
 * from this array, so none of them need editing. This is a plain typed array
 * rather than a runtime plugin system: you get autocomplete, and a type error
 * the moment an entry is incomplete.
 */
export const TOOLS: Tool[] = [
  {
    key: "water",
    label: "Water",
    href: "/water" as Route,
    icon: Droplet,
    accent: "var(--tool-water)",
    tagline: "Sip by sip, toward the day's goal.",
    shareable: true,
  },
  {
    key: "workouts",
    label: "Workouts",
    href: "/workouts" as Route,
    icon: Dumbbell,
    accent: "var(--tool-workouts)",
    tagline: "Sessions, sets and what you lifted.",
    shareable: true,
  },
  {
    key: "classwork",
    label: "Classwork",
    href: "/classwork" as Route,
    icon: BookOpen,
    accent: "var(--tool-classwork)",
    tagline: "Courses, assignments and what's due.",
    shareable: false,
  },
  {
    key: "calendar",
    label: "Calendar",
    href: "/calendar" as Route,
    icon: CalendarDays,
    accent: "var(--tool-calendar)",
    tagline: "Every dated thing, in one grid.",
    shareable: false,
  },
];

export const TOOL_BY_KEY = Object.fromEntries(TOOLS.map((t) => [t.key, t])) as Record<ToolKey, Tool>;
