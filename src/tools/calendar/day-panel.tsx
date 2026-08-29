"use client";

import { useMutation, useQuery } from "convex/react";
import { BookOpen, CalendarDays, Check, Droplet, Dumbbell, Repeat } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { todayKey } from "@/lib/dates";
import { formatCups } from "@/lib/units";
import { formatDuration } from "@/lib/duration";
import { TOOL_BY_KEY } from "@/tools/registry";
import { Ring } from "@/tools/water/ring";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

export function minutesToLabel(min?: number) {
  if (min === undefined) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** A titled block that only renders when it has something to say. */
function Section({
  label,
  icon: Icon,
  accent,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0" style={{ color: accent }} />
        <span className="eyebrow">{label}</span>
      </div>
      {children}
    </section>
  );
}

function Line({
  title,
  detail,
  trailing,
  muted,
  onToggle,
  checked,
}: {
  title: string;
  detail?: string | null;
  trailing?: React.ReactNode;
  muted?: boolean;
  onToggle?: () => void;
  checked?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-tile bg-surface-sunk px-3 py-2">
      {onToggle ? (
        <button
          type="button"
          aria-label={checked ? "Mark not done" : "Mark done"}
          onClick={onToggle}
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
            checked ? "border-sage bg-sage text-white" : "border-line-strong hover:border-terracotta"
          )}
        >
          {checked ? <Check className="size-2.5" /> : null}
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", muted && "text-ink-faint line-through")}>
          {title}
        </p>
        {detail ? <p className="truncate text-xs text-ink-faint">{detail}</p> : null}
      </div>
      {trailing}
    </div>
  );
}

/**
 * The day panel. The grid tells you *which* days had something; this tells you
 * how the day actually went — water against goal, what you lifted, what was
 * due and what you finished.
 */
export function DayPanel({ date }: { date: string }) {
  const summary = useQuery(api.calendar.day, { date });
  const removeEvent = useMutation(api.calendar.removeEvent);
  const setStatus = useMutation(api.classwork.setStatus);

  if (summary === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-tile" />
        <Skeleton className="h-16 w-full rounded-tile" />
      </div>
    );
  }

  const { water, workouts, planned, due, finished, events } = summary;
  const waterPct = water.goalMl > 0 ? Math.min(water.totalMl / water.goalMl, 1) : 0;
  const isEmpty =
    water.logCount === 0 &&
    workouts.length === 0 &&
    planned.length === 0 &&
    due.length === 0 &&
    finished.length === 0 &&
    events.length === 0;

  if (isEmpty) {
    return (
      <p className="px-1 py-6 text-center text-sm text-ink-muted">
        Nothing logged on this day.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Water always shows once anything was logged — progress is the point. */}
      {water.logCount > 0 ? (
        <Section label="Water" icon={Droplet} accent={TOOL_BY_KEY.water.accent}>
          <div className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2.5">
            <Ring value={water.totalMl} goal={water.goalMl} size={44} stroke={5}>
              <span className="text-[0.5625rem] font-bold">{Math.round(waterPct * 100)}%</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {formatCups(water.totalMl)} of {formatCups(water.goalMl)}
              </p>
              <p className="text-xs text-ink-faint">
                {water.logCount} log{water.logCount === 1 ? "" : "s"}
                {water.totalMl >= water.goalMl ? " · goal met" : ""}
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {workouts.length > 0 ? (
        <Section label="Workouts" icon={Dumbbell} accent={TOOL_BY_KEY.workouts.accent}>
          <div className="space-y-1.5">
            {workouts.map((workout) => (
              /* The session is the heading and its exercises sit under it —
                 "3 sets" alone never told you what you actually did. */
              <div key={workout.id} className="rounded-tile bg-surface-sunk px-3 py-2.5">
                <div className="flex items-baseline gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{workout.name}</p>
                  <p className="shrink-0 text-xs text-ink-faint">
                    {[
                      workout.volume > 0 ? `${workout.volume.toLocaleString()} lb` : null,
                      workout.timeSec > 0 ? formatDuration(workout.timeSec) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                {workout.sets.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 border-l-2 border-line pl-2.5">
                    {workout.sets.map((set) => (
                      <li key={set.id} className="flex items-baseline gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-ink-muted">
                          {set.exercise}
                        </span>
                        <span className="shrink-0 tabular-nums text-ink-faint">
                          {set.kind === "time"
                            ? formatDuration(set.durationSec ?? 0)
                            : `${set.reps ?? 0} × ${set.weight ?? 0}${set.unit ?? "lb"}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-ink-faint">No sets logged.</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {planned.length > 0 ? (
        <Section label="Planned" icon={Repeat} accent="var(--ink-faint)">
          <div className="space-y-1.5">
            {planned.map((item) => (
              <Line
                key={item.id}
                title={item.title}
                detail={minutesToLabel(item.startMin) ?? "repeats weekly"}
                trailing={<Badge tone="outline">planned</Badge>}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {events.length > 0 ? (
        <Section label="Events" icon={CalendarDays} accent={TOOL_BY_KEY.calendar.accent}>
          <div className="space-y-1.5">
            {events.map((event) => (
              <Line
                key={event.id}
                title={event.title}
                detail={
                  [minutesToLabel(event.startMin), event.location].filter(Boolean).join(" · ") ||
                  null
                }
                trailing={
                  <button
                    type="button"
                    onClick={() => removeEvent({ eventId: event.id })}
                    className="shrink-0 text-xs text-ink-faint transition-colors hover:text-danger"
                  >
                    Delete
                  </button>
                }
              />
            ))}
          </div>
        </Section>
      ) : null}

      {due.length > 0 ? (
        <Section label="Due" icon={BookOpen} accent={TOOL_BY_KEY.classwork.accent}>
          <div className="space-y-1.5">
            {due.map((item) => (
              <Line
                key={item.id}
                title={item.title}
                detail={item.course}
                checked={item.status === "done"}
                muted={item.status === "done"}
                onToggle={() =>
                  setStatus({
                    assignmentId: item.id,
                    status: item.status === "done" ? "todo" : "done",
                    today: todayKey(),
                  })
                }
              />
            ))}
          </div>
        </Section>
      ) : null}

      {finished.length > 0 ? (
        <Section label="Finished this day" icon={Check} accent="var(--sage)">
          <div className="space-y-1.5">
            {finished.map((item) => (
              <Line key={item.id} title={item.title} detail={item.course} muted />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
