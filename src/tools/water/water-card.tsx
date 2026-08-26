"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Droplet, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/states";
import { Ring } from "./ring";
import { useLogWater, useUndoWater, useWaterDay, formatLitres } from "./use-water";

const QUICK_ADD = [250, 500];

/** A short buzz on log — the phone equivalent of a satisfying click. */
function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
}

export function WaterCard({ date }: { date: string }) {
  const me = useQuery(api.users.me);
  const day = useWaterDay(date);
  const log = useLogWater(me?._id);
  const undo = useUndoWater();
  const [custom, setCustom] = useState("");

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
                toast("Last sip removed");
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
              <p className="font-display text-2xl leading-none">{formatLitres(day.totalMl)}</p>
              <p className="text-[0.6875rem] text-ink-faint">of {formatLitres(day.goalMl)}</p>
            </div>
          </Ring>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {QUICK_ADD.map((ml) => (
          <Button key={ml} variant="sage" size="sm" onClick={() => add(ml)} disabled={!day}>
            +{ml}ml
          </Button>
        ))}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" disabled={!day}>
              Custom
            </Button>
          </DialogTrigger>
          <DialogContent title="How much?" description="Anything up to 5,000ml in one go.">
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ml = Number(custom);
                if (!Number.isFinite(ml) || ml <= 0) return;
                setCustom("");
                await add(ml);
                toast.success(`${ml}ml logged`);
              }}
            >
              <Input
                autoFocus
                inputMode="numeric"
                placeholder="750"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <DialogClose asChild>
                <Button type="submit">Add</Button>
              </DialogClose>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
