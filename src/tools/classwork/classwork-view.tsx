"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { todayKey, shiftKey, formatDayShort } from "@/lib/dates";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
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
  course: { name: string; code?: string; color: string } | null;
};

/** Buckets by urgency rather than by date — the question is "what now?". */
function bucket(assignments: Assignment[]) {
  const today = todayKey();
  const weekOut = shiftKey(today, 7);
  const groups: Record<string, Assignment[]> = {
    Overdue: [],
    Today: [],
    "This week": [],
    Later: [],
    Done: [],
  };

  for (const item of assignments) {
    if (item.status === "done") groups.Done.push(item);
    else if (item.date < today) groups.Overdue.push(item);
    else if (item.date === today) groups.Today.push(item);
    else if (item.date <= weekOut) groups["This week"].push(item);
    else groups.Later.push(item);
  }
  return groups;
}

function statusTone(group: string) {
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
        onClick={() => setStatus({ assignmentId: item._id, status: done ? "todo" : "done" })}
        className={cn(
          "size-4 shrink-0 rounded-full border-2 transition-colors",
          done ? "border-sage bg-sage" : "border-line-strong hover:border-terracotta"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", done && "text-ink-faint line-through")}>
          {item.title}
        </p>
        {item.course ? (
          <p className="flex items-center gap-1.5 truncate text-xs text-ink-faint">
            <span className="size-1.5 rounded-full" style={{ background: item.course.color }} />
            {item.course.code ?? item.course.name}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs text-ink-faint">{formatDayShort(item.date)}</span>
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
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [courseId, setCourseId] = useState<string>("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Assignment
        </Button>
      </DialogTrigger>
      <DialogContent title="New assignment" description="What's due, and when?">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await add({
              title,
              date,
              courseId: courseId ? (courseId as Id<"courses">) : undefined,
            });
            setTitle("");
            toast.success("Added");
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
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="h-10 w-full rounded-full border border-line-strong bg-surface px-4 text-sm text-ink focus:border-terracotta focus:outline-none"
              >
                <option value="">No course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <DialogClose asChild>
            <Button type="submit" className="w-full">
              Add
            </Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClassworkView() {
  const courses = useQuery(api.classwork.courses);
  const assignments = useQuery(api.classwork.assignments);
  const addCourse = useMutation(api.classwork.addCourse);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");

  const groups = assignments ? bucket(assignments as Assignment[]) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Classwork</p>
          <h1 className="font-display text-4xl">What&rsquo;s due</h1>
        </div>
        <AddAssignment courses={courses ?? []} />
      </header>

      {assignments === undefined ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : assignments.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={BookOpen}
            title="Nothing due"
            body="Add your courses, then drop assignments in as they're set. Anything with a due date also lands on the calendar."
          />
        </Card>
      ) : (
        Object.entries(groups ?? {})
          .filter(([, items]) => items.length > 0)
          .map(([group, items]) => (
            <Card key={group} className="space-y-3 p-5">
              <CardHead
                label={group}
                accent={ACCENT}
                trailing={<Badge tone={statusTone(group)}>{items.length}</Badge>}
              />
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <Row key={item._id} item={item} />
                ))}
              </ul>
            </Card>
          ))
      )}

      <Card className="space-y-3 p-5">
        <CardHead label="Courses" icon={BookOpen} accent={ACCENT} />
        {courses && courses.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {courses.map((course) => (
              <li key={course._id}>
                <Badge tone="outline">
                  <span className="size-1.5 rounded-full" style={{ background: course.color }} />
                  {course.code ? `${course.code} · ` : ""}
                  {course.name}
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
            className="h-9 min-w-0 flex-[2] basis-40"
          />
          <Input
            placeholder="Code"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="h-9 min-w-0 flex-1 basis-24"
          />
          <Button type="submit" size="icon-sm" variant="secondary" aria-label="Add course">
            <Plus className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
