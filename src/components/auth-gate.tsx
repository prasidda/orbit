"use client";

import { useEffect } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery, useMutation } from "convex/react";
import { RedirectToSignIn } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Brand } from "@/components/shell/brand";

/**
 * A calm, on-brand hold while auth settles. It replaces what would otherwise
 * be a flash of half-rendered shell.
 */
function BootScreen({ note }: { note?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ground px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="animate-pulse">
          <Brand />
        </div>
        <p className="text-sm text-ink-faint">{note ?? "Getting your things…"}</p>
      </div>
    </div>
  );
}

/**
 * Clerk owns identity; Convex needs a `users` row to hang data off. Until that
 * row exists, every other query would throw "Not signed in", so this holds the
 * app back until the mirror is in place — one wait instead of a race in every
 * tool.
 */
function EnsureProfile({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.users.me);
  const store = useMutation(api.users.store);

  useEffect(() => {
    // `null` means authenticated with Clerk but no Convex row yet.
    if (me === null) void store();
  }, [me, store]);

  if (me === undefined) return <BootScreen />;
  if (me === null) return <BootScreen note="Setting up your account…" />;

  return <>{children}</>;
}

/**
 * The three states Convex auth can be in. Nothing that queries Convex renders
 * outside `<Authenticated>`, which is what keeps unauthenticated queries — and
 * the "Not signed in" errors they throw — from ever being sent.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <BootScreen />
      </AuthLoading>

      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>

      <Authenticated>
        <EnsureProfile>{children}</EnsureProfile>
      </Authenticated>
    </>
  );
}
