"use client";

import { Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";

function Step({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={
          done
            ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sage text-white"
            : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-sunk text-ink-faint"
        }
      >
        {done ? <Check className="size-3" /> : <Circle className="size-2 fill-current" />}
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">{title}</p>
        <div className="text-sm text-ink-muted [&_code]:rounded [&_code]:bg-surface-sunk [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.8125rem] [&_code]:text-terracotta-ink">
          {children}
        </div>
      </div>
    </li>
  );
}

/**
 * Shown when the app boots without its backend keys. A fresh clone hits this
 * every time, so it's a real screen rather than a crash.
 */
export function SetupNeeded({ hasConvex, hasClerk }: { hasConvex: boolean; hasClerk: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-12">
      <div className="space-y-2">
        <p className="eyebrow">Almost there</p>
        <h1 className="font-display text-5xl">orbit</h1>
        <p className="text-ink-muted">
          The app is built and running — it just needs its two backend keys before it can
          store anything.
        </p>
      </div>

      <Card className="p-6">
        <ol className="space-y-5">
          <Step done={hasConvex} title="Connect Convex (database)">
            Run <code>npx convex dev</code> in this folder and follow the browser login. It
            writes <code>NEXT_PUBLIC_CONVEX_URL</code> into <code>.env.local</code> and
            deploys the schema.
          </Step>
          <Step done={hasClerk} title="Connect Clerk (sign-in)">
            Create an app at <code>dashboard.clerk.com</code>, enable Google, then paste
            <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> into
            <code>.env.local</code>.
          </Step>
          <Step done={false} title="Point Convex at Clerk">
            Copy the Clerk JWT template issuer URL into the Convex dashboard as
            <code>CLERK_JWT_ISSUER_DOMAIN</code>.
          </Step>
        </ol>
      </Card>

      <p className="text-center text-xs text-ink-faint">
        Restart <code className="text-ink-muted">npm run dev</code> after editing .env.local.
      </p>
    </main>
  );
}
