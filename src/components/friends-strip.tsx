"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatLitres } from "@/tools/water/use-water";

/**
 * The live friend feed. Convex queries are reactive, so a friend's total
 * moves here the moment they log — no polling, no refresh.
 */
export function FriendsStrip({ date }: { date: string }) {
  const stats = useQuery(api.friends.dailyStats, { date });
  const nudge = useMutation(api.friends.nudge);

  if (stats === undefined) return null;

  if (stats.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState
          icon={Users}
          title="No one else here yet"
          body="Add a friend by their handle and you'll see each other's day — only for the tools you each choose to share."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={"/friends" as Route}>Add a friend</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-5">
      <CardHead label="Friends today" icon={Users} accent="var(--sage)" />
      <ul className="space-y-2">
        {stats.map(({ user, water }) => {
          const pct = water ? Math.min(water.totalMl / water.goalMl, 1) : 0;
          return (
            <li
              key={user._id}
              className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2.5"
            >
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-[0.625rem] font-bold uppercase text-white">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  user.name.slice(0, 2)
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
                {water ? (
                  <p className="truncate text-xs text-ink-muted">
                    {formatLitres(water.totalMl)} of {formatLitres(water.goalMl)}
                    {water.lastLoggedAt
                      ? ` · ${formatDistanceToNowStrict(water.lastLoggedAt)} ago`
                      : " · nothing yet today"}
                  </p>
                ) : (
                  <p className="truncate text-xs text-ink-faint">Not sharing water</p>
                )}
              </div>

              {water ? (
                <>
                  <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[color:var(--surface)] sm:block">
                    <div
                      className="h-full rounded-full bg-water transition-[width] duration-500"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await nudge({
                        userId: user._id,
                        tool: "water",
                        message: "Drink some water 👀",
                      });
                      toast.success(`Nudged ${user.name}`);
                    }}
                  >
                    Nudge
                  </Button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
