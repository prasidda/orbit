import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-full bg-surface-sunk", className)} />
  );
}

/**
 * Empty states carry real copy, not "No data". A personal app is mostly
 * empty on day one, so this is a screen the user genuinely reads.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      {Icon ? (
        <div className="grid size-12 place-items-center rounded-full bg-surface-sunk text-ink-faint">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="font-display text-lg">{title}</p>
        {body ? <p className="mx-auto max-w-[32ch] text-sm text-ink-muted">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
