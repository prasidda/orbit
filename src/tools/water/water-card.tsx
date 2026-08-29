"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Droplet, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/states";
import { CUP_ML, formatCups } from "@/lib/units";
import { Ring } from "./ring";
import { AmountInput, useAmountInput } from "./amount-input";
import { useLogWater, useUndoWater, useWaterDay } from "./use-water";

const QUICK_ADD = [1, 2];

/** A short buzz on log — the phone equivalent of a satisfying click. */
function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
}

export function WaterCard({ date }: { date: string }) {
  const me = useQuery(api.users.me);
  const day = useWaterDay(date);
  const log = useLogWater(me?._id);
  const undo = useUndoWater();
  const amount = useAmountInput();
  const [customOpen, setCustomOpen] = useState(false);

  const add = async (ml: number) => {
    haptic();
    await log({ date, amountMl: ml });
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardHead
        label="Water"
        icon={Droplet}
        accent="var(--tool-water)"
        trailing={
          day && day.logs.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                await undo({ date });
                toast("Last cup removed");
              }}
              className="flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-ink"
            >
              <Undo2 className="size-3" />
              Undo
            </button>
          ) : null
        }
      />

      <div className="flex flex-col items-center gap-1">
        {day === undefined ? (
          <Skeleton className="size-[132px]" />
        ) : (
          <Ring value={day.totalMl} goal={day.goalMl}>
            <div className="space-y-0.5">
              <p className="font-display text-2xl leading-none">{formatCups(day.totalMl)}</p>
              <p className="text-[0.6875rem] text-ink-faint">
                of {formatCups(day.goalMl)}
              </p>
            </div>
          </Ring>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {QUICK_ADD.map((cups) => (
          <Button
            key={cups}
            variant="sage"
            size="sm"
            onClick={() => add(cups * CUP_ML)}
            disabled={!day}
          >
            +{cups} cup{cups === 1 ? "" : "s"}
          </Button>
        ))}

        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" disabled={!day}>
              Custom
            </Button>
          </DialogTrigger>
          <DialogContent title="How much?" description="Cups, millilitres or ounces.">
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!amount.valid) return;
                const ml = amount.ml;
                // Close first so the sheet doesn't hang around on a slow network,
                // then log — the optimistic update paints the ring immediately.
                setCustomOpen(false);
                amount.reset();
                await add(ml);
                toast.success(`${formatCups(ml)} logged`);
              }}
            >
              <AmountInput
                autoFocus
                placeholder="3"
                value={amount.value}
                onChange={amount.setValue}
                unit={amount.unit}
                onUnitChange={amount.setUnit}
              />
              <Button type="submit" className="w-full" disabled={!amount.valid}>
                Add
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
