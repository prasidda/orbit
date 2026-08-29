"use client";

import { useMutation, useQuery } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * The optimistic updaters are built at module scope on purpose. They run when
 * the mutation fires, not during render, and defining them outside the hook
 * keeps `Date.now()` out of the render path.
 */
const optimisticLog =
  (myId: Id<"users"> | undefined) =>
  (localStore: OptimisticLocalStore, args: { date: string; amountMl: number }) => {
    const current = localStore.getQuery(api.water.day, { date: args.date });
    if (!current || !myId) return;

    const now = Date.now();
    localStore.setQuery(
      api.water.day,
      { date: args.date },
      {
        ...current,
        totalMl: current.totalMl + args.amountMl,
        logs: [
          {
            _id: crypto.randomUUID() as Id<"waterLogs">,
            _creationTime: now,
            userId: myId,
            date: args.date,
            amountMl: args.amountMl,
            loggedAt: now,
          },
          ...current.logs,
        ],
      }
    );
  };

/**
 * Water logging with an optimistic update, so the ring moves on the same
 * frame as the tap instead of waiting for the round trip.
 */
export function useLogWater(myId: Id<"users"> | undefined) {
  return useMutation(api.water.log).withOptimisticUpdate(optimisticLog(myId));
}

export function useUndoWater() {
  return useMutation(api.water.undoLast).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.water.day, { date: args.date });
    if (!current || current.logs.length === 0) return;

    const [dropped, ...rest] = current.logs;
    localStore.setQuery(
      api.water.day,
      { date: args.date },
      { ...current, totalMl: current.totalMl - dropped.amountMl, logs: rest }
    );
  });
}

export function useWaterDay(date: string) {
  return useQuery(api.water.day, { date });
}
