import { cn } from "@/lib/utils";

/** The orbit mark: a terracotta disc with a small satellite. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-7 shrink-0 place-items-center rounded-full bg-terracotta",
        className
      )}
    >
      <span className="size-2 rounded-full bg-[color:var(--surface)]" />
      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-sage ring-2 ring-[color:var(--rail)]" />
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-display text-2xl leading-none">orbit</span>
    </span>
  );
}
