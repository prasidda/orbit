"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "orbit-theme";

/**
 * Theme lives in an external store (localStorage + the OS media query) rather
 * than in React state. `useSyncExternalStore` gives us the server snapshot
 * hook we need, so hydration is correct without a `mounted` flag and without
 * setting state inside an effect.
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readStored(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  } catch {
    // Private mode, blocked storage — "system" is a fine answer.
    return "system";
  }
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Snapshot must be a stable primitive, so theme and resolved are packed. */
function snapshot(): string {
  const theme = readStored();
  const resolved = theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
  return `${theme}|${resolved}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", emit);
  window.addEventListener("storage", emit); // other tabs
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", emit);
    window.removeEventListener("storage", emit);
  };
}

export function useTheme() {
  const packed = useSyncExternalStore(subscribe, snapshot, () => "system|light");
  const [theme, resolved] = packed.split("|") as [Theme, "light" | "dark"];

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-persistent is still better than broken.
    }
    emit();
  }, []);

  return { theme, resolved, setTheme };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();

  // Syncing the class onto <html> is exactly what effects are for: pushing
  // React state out to an external system.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  return children;
}

/**
 * Runs before paint so the correct theme class is on <html> for the very
 * first frame. Without this the cream ground flashes on a dark-mode load.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
