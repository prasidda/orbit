"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { todayKey, shiftKey, formatDayShort } from "@/lib/dates";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ACCENT = "var(--tool-classwork)";
const COURSE_COLORS = [
  "var(--terracotta)",
  "var(--sage)",
  "var(--honey)",
  "var(--tool-water)",
  "var(--clay)",
];

type Assignment = {
  _id: Id<"assignments">;
  title: string;
  date: string;
  status: "todo" | "doing" | "done";
  completedDate?: string;
  course: { name: string; code?: string; color: string } | null;
};

/** Urgency, not chronology — the question a todo list answers is "what now?". */
const GROUP_ORDER = ["Overdue", "Today", "This week", "Later", "Done"] as const;
type Group = (typeof GROUP_ORDER)[number];

function bucket(assignments: Assignment[]): Record<Group, Assignment[]> {
  const today = todayKey();
  const weekOut = shiftKey(today, 7);
  const groups = {
    Overdue: [],
    Today: [],
    "This week": [],
    Later: [],
    Done: [],
  } as Record<Group, Assignment[]>;

  for (const item of assignments) {
    if (item.status === "done") groups.Done.push(item);
    else if (item.date < today) groups.Overdue.push(item);
    else if (item.date === today) groups.Today.push(item);
    else if (item.date <= weekOut) groups["This week"].push(item);
    else groups.Later.push(item);
  }
  return groups;
}

/**
 * The list deliberately reaches past today by default. A todo list that only
 * shows what's due today hides the work that's about to become urgent, which
 * is the thing you most want warning about.
 */
const FILTERS = [
  { key: "open", label: "Open", groups: ["Overdue", "Today", "This week", "Later"] },
  { key: "week", label: "This week", groups: ["Overdue", "Today", "This week"] },
  { key: "done", label: "Done", groups: ["Done"] },
  { key: "all", label: "All", groups: [...GROUP_ORDER] },
] as const;

function groupTone(group: Group) {
  if (group === "Overdue") return "danger" as const;
  if (group === "Today") return "terracotta" as const;
  if (group === "Done") return "sage" as const;
  return "neutral" as const;
}

function Row({ item }: { item: Assignment }) {
  const setStatus = useMutation(api.classwork.setStatus);
  const remove = useMutation(api.classwork.removeAssignment);
  const done = item.status === "done";

  return (
    <li className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2.5">
      <button
        type="button"
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={() =>
          setStatus({
            assignmentId: item._id,
            status: done ? "todo" : "done",
            today: todayKey(),
          })
        }
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          done ? "border-sage bg-sage text-white" : "border-line-strong hover:border-terracotta"
        )}
      >
        {done ? <Check className="size-3" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", done && "text-ink-faint line-through")}>
          {item.title}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-faint">
          {item.course ? (
            <>
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: item.course.color }} />
              {item.course.code ?? item.course.name}
              <span aria-hidden>·</span>
            </>
          ) : null}
          {done && item.completedDate
            ? `finished ${formatDayShort(item.completedDate)}`
            : `due ${formatDayShort(item.date)}`}
        </p>
      </div>

      <button
        type="button"
        aria-label="Delete"
        onClick={() => remove({ assignmentId: item._id })}
        className="grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

function AddAssignment({ courses }: { courses: { _id: Id<"courses">; name: string }[] }) {
  const add = useMutation(api.classwork.addAssignment);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [courseId, setCourseId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0">
          <Plus className="size-4" />
          Assignment
        </Button>
      </DialogTrigger>
      <DialogContent title="New assignment" description="What's due, and when?">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim() || saving) return;
            setSaving(true);
            try {
              await add({
                title,
                date,
                courseId: courseId ? (courseId as Id<"courses">) : undefined,
              });
              setTitle("");
              setOpen(false);
              toast.success("Added");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not add that");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Title">
            <Input
              autoFocus
              placeholder="Problem set 6"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Due">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {courses.length > 0 ? (
            <Field label="Course">
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">No course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Button type="submit" className="w-full" disabled={saving || !title.trim()}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClassworkView() {
  const courses = useQuery(api.classwork.courses);
  const assignments = useQuery(api.classwork.assignments);
  const addCourse = useMutation(api.classwork.addCourse);
  const removeCourse = useMutation(api.classwork.removeCourse);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("open");

  const groups = assignments ? bucket(assignments as Assignment[]) : null;
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const visible = groups
    ? (active.groups as readonly Group[])
        .map((group) => [group, groups[group]] as const)
        .filter(([, items]) => items.length > 0)
    : [];

  const openCount = groups
    ? groups.Overdue.length + groups.Today.length + groups["This week"].length + groups.Later.length
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="eyebrow">Classwork</p>
          <h1 className="font-display text-3xl sm:text-4xl">Checklist</h1>
        </div>
        <AddAssignment courses={courses ?? []} />
      </header>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === option.key
                ? "bg-terracotta text-white"
                : "bg-surface text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
            {option.key === "open" && openCount > 0 ? ` · ${openCount}` : ""}
          </button>
        ))}
      </div>

      {assignments === undefined ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : visible.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={BookOpen}
            title={filter === "done" ? "Nothing finished yet" : "Nothing here"}
            body={
              filter === "done"
                ? "Check something off and it lands here — and on the calendar, on the day you finished it."
                : "Add your courses, then drop assignments in as they're set. Anything with a due date also lands on the calendar."
            }
          />
        </Card>
      ) : (
        visible.map(([group, items]) => (
          <Card key={group} className="space-y-3 p-4 sm:p-5">
            <CardHead
              label={group}
              accent={ACCENT}
              trailing={<Badge tone={groupTone(group)}>{items.length}</Badge>}
            />
            <ul className="space-y-1.5">
              {items.map((item) => (
                <Row key={item._id} item={item} />
              ))}
            </ul>
          </Card>
        ))
      )}

      <Card className="space-y-3 p-4 sm:p-5">
        <CardHead label="Courses" icon={BookOpen} accent={ACCENT} />
        {courses && courses.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {courses.map((course) => (
              <li key={course._id}>
                <Badge tone="outline" className="pr-1">
                  <span className="size-1.5 rounded-full" style={{ background: course.color }} />
                  {course.code ? `${course.code} · ` : ""}
                  {course.name}
                  <button
                    type="button"
                    aria-label={`Delete ${course.name}`}
                    onClick={async () => {
                      await removeCourse({ courseId: course._id });
                      toast(`${course.name} deleted`, {
                        description: "Its assignments stayed, just untagged.",
                      });
                    }}
                    className="ml-0.5 grid size-4 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!courseName.trim()) return;
            await addCourse({
              name: courseName,
              code: courseCode || undefined,
              color: COURSE_COLORS[(courses?.length ?? 0) % COURSE_COLORS.length],
            });
            setCourseName("");
            setCourseCode("");
          }}
        >
          <Input
            placeholder="Course name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="h-10 min-w-0 flex-[2] basis-40"
          />
          <Input
            placeholder="Code"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="h-10 min-w-0 flex-1 basis-24"
          />
          <Button type="submit" size="icon" variant="secondary" aria-label="Add course">
            <Plus className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
