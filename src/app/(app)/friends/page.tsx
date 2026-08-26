"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, UserPlus, X, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { todayKey } from "@/lib/dates";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Ring } from "@/tools/water/ring";
import { formatLitres } from "@/tools/water/use-water";

function Avatar({ name, imageUrl, size = 40 }: { name: string; imageUrl?: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-xs font-bold uppercase text-white"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 2)
      )}
    </span>
  );
}

export default function FriendsPage() {
  const date = todayKey();
  const me = useQuery(api.users.me);
  const list = useQuery(api.friends.list);
  const stats = useQuery(api.friends.dailyStats, { date });
  const request = useMutation(api.friends.request);
  const respond = useMutation(api.friends.respond);
  const remove = useMutation(api.friends.remove);
  const [handle, setHandle] = useState("");

  const statsByUser = new Map((stats ?? []).map((s) => [s.user._id, s]));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Friends</p>
        <h1 className="font-display text-4xl">Who&rsquo;s along for the ride</h1>
        <p className="text-sm text-ink-muted">
          You share tools one at a time, and only with people you&rsquo;ve accepted. Everything
          stays private until you say otherwise.
        </p>
      </header>

      <Card className="space-y-3 p-5">
        <CardHead label="Add someone" icon={UserPlus} accent="var(--terracotta)" />
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const value = handle.trim();
            if (!value) return;
            try {
              const result = await request({ handle: value });
              setHandle("");
              toast.success(result === "accepted" ? "You are now friends" : "Request sent");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not send that");
            }
          }}
        >
          <Input
            placeholder="their handle, e.g. dev"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <Button type="submit">Send</Button>
        </form>
        {me ? (
          <p className="text-xs text-ink-faint">
            Yours is <span className="font-semibold text-ink-muted">@{me.handle}</span> — send them
            that.
          </p>
        ) : null}
      </Card>

      {list?.incoming.length ? (
        <Card className="space-y-3 p-5">
          <CardHead label="Waiting on you" accent="var(--terracotta)" />
          <ul className="space-y-2">
            {list.incoming.map(({ friendshipId, user }) => (
              <li
                key={friendshipId}
                className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2.5"
              >
                <Avatar name={user.name} imageUrl={user.imageUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-ink-faint">@{user.handle}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="sage"
                  aria-label="Accept"
                  onClick={() => respond({ friendshipId, accept: true })}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Decline"
                  onClick={() => respond({ friendshipId, accept: false })}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-3 p-5">
        <CardHead label="Your people" icon={Users} accent="var(--sage)" />

        {list === undefined ? (
          <Skeleton className="h-20 w-full rounded-tile" />
        ) : list.friends.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nobody yet"
            body="Send someone your handle. Once they accept, whatever you have chosen to share shows up here — live."
          />
        ) : (
          <ul className="space-y-2">
            {list.friends.map((friend) => {
              const stat = statsByUser.get(friend._id);
              return (
                <li
                  key={friend._id}
                  className="flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-3"
                >
                  <Avatar name={friend.name} imageUrl={friend.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{friend.name}</p>
                    <p className="truncate text-xs text-ink-faint">
                      @{friend.handle}
                      {stat?.water?.lastLoggedAt
                        ? ` · last sip ${formatDistanceToNowStrict(stat.water.lastLoggedAt)} ago`
                        : ""}
                    </p>
                    {stat?.workouts?.count ? (
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {stat.workouts.names.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  {stat?.water ? (
                    <Ring value={stat.water.totalMl} goal={stat.water.goalMl} size={48} stroke={6}>
                      <span className="text-[0.5625rem] font-semibold text-ink-muted">
                        {formatLitres(stat.water.totalMl)}
                      </span>
                    </Ring>
                  ) : (
                    <Badge tone="outline">private</Badge>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await remove({ userId: friend._id });
                      toast("Removed");
                    }}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {list?.outgoing.length ? (
        <p className="px-1 text-xs text-ink-faint">
          Waiting on {list.outgoing.map((o) => `@${o.user.handle}`).join(", ")} to accept.
        </p>
      ) : null}
    </div>
  );
}
