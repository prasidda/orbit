import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `text-base sm:text-sm` is not a style choice — it's the fix for iOS.
 *
 * Mobile Safari force-zooms the page whenever a focused input's font-size is
 * under 16px, and never zooms back out. Our 14px (`text-sm`) fields triggered
 * it on every tap. 16px on phones stops it at the source; desktop keeps the
 * smaller size where there's no such behaviour.
 *
 * The other fix people reach for — `maximum-scale=1` on the viewport meta —
 * works by disabling pinch-zoom entirely, which breaks the page for anyone who
 * needs to magnify it. Not worth it.
 */
const fieldBase =
  "w-full border border-line-strong bg-surface text-ink text-base sm:text-sm " +
  "placeholder:text-ink-faint focus:border-terracotta focus:outline-none transition-colors duration-150";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-11 rounded-full px-4 sm:h-10", className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, "rounded-tile px-4 py-3 resize-none", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** Native select, styled to match Input — same 16px rule applies. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldBase, "h-11 rounded-full px-4 sm:h-10", className)}
    {...props}
  />
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}
