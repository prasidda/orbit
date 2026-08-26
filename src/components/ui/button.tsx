"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Everything clickable in Orbit is a pill. Corners are fully round, weight
 * comes from fill rather than borders, and the press state is a small scale
 * rather than a color jump.
 */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-terracotta text-white shadow-[0_1px_2px_rgb(43_38_34/0.12)] hover:bg-terracotta-hover",
        secondary:
          "bg-surface text-ink border border-line-strong hover:bg-surface-sunk",
        soft: "bg-terracotta-soft text-terracotta-ink hover:brightness-[0.97]",
        sage: "bg-sage text-white hover:brightness-95",
        ghost: "text-ink-muted hover:bg-surface-sunk hover:text-ink",
        danger: "bg-danger text-white hover:brightness-95",
      },
      size: {
        sm: "h-8 px-3.5 text-[0.8125rem]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(button({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";

export { button as buttonVariants };
