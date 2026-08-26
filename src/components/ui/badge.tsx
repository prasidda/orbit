import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunk text-ink-muted",
        terracotta: "bg-terracotta-soft text-terracotta-ink",
        sage: "bg-sage-soft text-sage-ink",
        honey: "bg-honey-soft text-clay",
        danger: "bg-danger-soft text-danger",
        outline: "border border-line-strong text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
