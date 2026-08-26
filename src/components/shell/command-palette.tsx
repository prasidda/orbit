"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useMutation } from "convex/react";
import { Droplet, Home, Moon, Search, Settings, Sun, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { TOOLS } from "@/tools/registry";
import { useTheme } from "@/components/theme-provider";
import { todayKey } from "@/lib/dates";

/**
 * A module-level store rather than a context, so the trigger buttons in the
 * rail and the top bar can open the palette without threading a provider
 * through the shell.
 */
let isOpen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const store = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => isOpen,
  set(next: boolean) {
    isOpen = next;
    emit();
  },
};

export function useCommandPalette() {
  const open = useSyncExternalStore(store.subscribe, store.get, () => false);
  return {
    isOpen: open,
    open: useCallback(() => store.set(true), []),
    close: useCallback(() => store.set(false), []),
    toggle: useCallback(() => store.set(!store.get()), []),
  };
}

export function CommandPalette() {
  const { isOpen: open, close, toggle } = useCommandPalette();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();
  const logWater = useMutation(api.water.log);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  const run = (fn: () => void) => {
    close();
    fn();
  };

  const go = (href: Route) => run(() => router.push(href));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => store.set(o)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(43_38_34/0.35)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-card border border-line bg-surface shadow-pop data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <VisuallyHidden asChild>
            <DialogPrimitive.Title>Command palette</DialogPrimitive.Title>
          </VisuallyHidden>

          <Command
            loop
            className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-ink-faint" />
              <Command.Input
                autoFocus
                placeholder="Log something, or jump anywhere…"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-muted">
                Nothing matches that.
              </Command.Empty>

              <Command.Group heading="Log">
                {[250, 500].map((ml) => (
                  <Item
                    key={ml}
                    icon={Droplet}
                    accent="var(--tool-water)"
                    label={`Water — add ${ml}ml`}
                    onSelect={() =>
                      run(async () => {
                        await logWater({ date: todayKey(), amountMl: ml });
                        toast.success(`${ml}ml logged`);
                      })
                    }
                  />
                ))}
              </Command.Group>

              <Command.Group heading="Go to">
                <Item icon={Home} label="Today" onSelect={() => go("/" as Route)} />
                {TOOLS.map((tool) => (
                  <Item
                    key={tool.key}
                    icon={tool.icon}
                    accent={tool.accent}
                    label={tool.label}
                    hint={tool.tagline}
                    onSelect={() => go(tool.href)}
                  />
                ))}
                <Item icon={Users} label="Friends" onSelect={() => go("/friends" as Route)} />
                <Item icon={Settings} label="Settings" onSelect={() => go("/settings" as Route)} />
              </Command.Group>

              <Command.Group heading="Appearance">
                <Item
                  icon={resolved === "dark" ? Sun : Moon}
                  label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
                  onSelect={() => run(() => setTheme(resolved === "dark" ? "light" : "dark"))}
                />
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Item({
  icon: Icon,
  label,
  hint,
  accent,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  hint?: string;
  accent?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`${label} ${hint ?? ""}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-full px-3 py-2.5 text-sm text-ink data-[selected=true]:bg-surface-sunk"
    >
      <Icon className="size-4 shrink-0" style={accent ? { color: accent } : undefined} />
      <span className="flex-1 truncate">{label}</span>
      {hint ? <span className="hidden truncate text-xs text-ink-faint sm:block">{hint}</span> : null}
    </Command.Item>
  );
}
