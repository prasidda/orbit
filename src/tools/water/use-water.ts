"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Water logging with an optimistic update, so the ring moves on the same
 * frame as the tap instead of waiting for the round trip.
 */
export function useLogWater(myId: Id<"users"> | undefined) {
  return useMutation(api.water.log).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.water.day, { date: args.date });
    if (!current || !myId) return;

    localStore.setQuery(
      api.water.day,
      { date: args.date },
      {
        ...current,
        totalMl: current.totalMl + args.amountMl,
        logs: [
          {
            _id: crypto.randomUUID() as Id<"waterLogs">,
            _creationTime: Date.now(),
            userId: myId,
            date: args.date,
            amountMl: args.amountMl,
            loggedAt: Date.now(),
          },
          ...current.logs,
        ],
      }
    );
  });
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

export const CUPS_ML = 250;

export function formatLitres(ml: number): string {
  return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2).replace(/\.?0+$/, "")} L`;
}
