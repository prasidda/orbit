"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../convex/_generated/api";
import { todayKey, greeting } from "@/lib/dates";
import { WaterCard } from "@/tools/water/water-card";
import { WorkoutsTodayCard, ClassworkTodayCard, NextUpCard } from "@/components/today-cards";
import { FriendsStrip } from "@/components/friends-strip";
import { ThemeToggle } from "@/components/shell/theme-toggle";

/**
 * The screen you actually live in: today's state for every tool, each with a
 * one-tap action so logging never needs a page change.
 */
export default function TodayPage() {
  const date = todayKey();
  const me = useQuery(api.users.me);
  const firstName = me?.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">{format(new Date(), "EEEE, d MMMM")}</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <ThemeToggle className="hidden lg:grid" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WaterCard date={date} />
        <WorkoutsTodayCard date={date} />
        <NextUpCard date={date} />
        <ClassworkTodayCard />
      </div>

      <FriendsStrip date={date} />
    </div>
  );
}
