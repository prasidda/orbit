import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        interactive &&
          "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        className
      )}
      {...props}
    />
  );
}

/**
 * The eyebrow + optional trailing slot that sits at the top of every card.
 * A colored dot ties the card back to its tool.
 */
export function CardHead({
  label,
  accent,
  icon: Icon,
  trailing,
  className,
}: {
  label: string;
  accent?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon className="size-3.5 shrink-0" style={accent ? { color: accent } : undefined} />
        ) : accent ? (
          <span className="size-2 rounded-full" style={{ background: accent }} />
        ) : null}
        <span className="eyebrow">{label}</span>
      </div>
      {trailing}
    </div>
  );
}
