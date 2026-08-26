"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * One component, two shapes: a centered card on desktop, a bottom sheet on
 * phones. Logging a set one-handed on a treadmill should not mean reaching
 * for a dialog floating in the middle of the screen.
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-[rgb(43_38_34/0.35)] backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 border border-line bg-surface shadow-pop",
          // phone: bottom sheet
          "inset-x-0 bottom-0 rounded-t-[1.75rem] px-5 pb-8 pt-5 safe-bottom",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4",
          // desktop: centered card
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md",
          "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:p-6",
          "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {/* grab handle, phone only */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" />

        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <DialogPrimitive.Title className="font-display text-xl">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <VisuallyHidden asChild>
                <DialogPrimitive.Description>{title}</DialogPrimitive.Description>
              </VisuallyHidden>
            )}
          </div>
          <DialogPrimitive.Close className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>

        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
