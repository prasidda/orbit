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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Ring } from "@/tools/water/ring";
import { formatCups, formatCupsShort } from "@/lib/units";

/**
 * The live friend feed. Convex queries are reactive, so a friend's ring fills
 * here the moment they log — no polling, no refresh.
 *
 * Each friend gets the same ring the owner sees on their own card, because a
 * glanceable comparison is the whole point of sharing it.
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
    <Card className="space-y-4 p-5">
      <CardHead label="Friends today" icon={Users} accent="var(--sage)" />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ user, water, workouts }) => (
          <li
            key={user._id}
            className="flex flex-col items-center gap-3 rounded-card bg-surface-sunk p-4 text-center"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-[0.625rem] font-bold uppercase text-white">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  user.name.slice(0, 2)
                )}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold">{user.name}</span>
            </div>

            {water ? (
              <>
                <Ring value={water.totalMl} goal={water.goalMl} size={104} stroke={10}>
                  <div className="space-y-0.5">
                    <p className="font-display text-xl leading-none">
                      {formatCupsShort(water.totalMl)}
                    </p>
                    <p className="text-[0.625rem] text-ink-faint">
                      of {formatCups(water.goalMl)}
                    </p>
                  </div>
                </Ring>

                <p className="text-xs text-ink-faint">
                  {water.lastLoggedAt
                    ? `last cup ${formatDistanceToNowStrict(water.lastLoggedAt)} ago`
                    : "nothing yet today"}
                </p>

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
            ) : (
              <div className="flex h-[104px] items-center">
                <Badge tone="outline">Not sharing water</Badge>
              </div>
            )}

            {workouts && workouts.count > 0 ? (
              <p className="truncate text-xs text-ink-muted">{workouts.names.join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
