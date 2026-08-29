"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Droplet, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { todayKey, shiftKey } from "@/lib/dates";
import { CUP_ML, formatCups } from "@/lib/units";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Ring } from "@/tools/water/ring";
import { AmountInput, useAmountInput } from "@/tools/water/amount-input";
import { useLogWater, useWaterDay } from "@/tools/water/use-water";
import { WaterHistory } from "@/tools/water/history";

const QUICK_ADD = [1, 2, 3];

export default function WaterPage() {
  const date = todayKey();
  const me = useQuery(api.users.me);
  const day = useWaterDay(date);
  const log = useLogWater(me?._id);
  const removeLog = useMutation(api.water.removeLog);
  const setGoal = useMutation(api.settings.setGoal);

  const custom = useAmountInput();
  const goal = useAmountInput();
  const [customOpen, setCustomOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const add = async (ml: number) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    await log({ date, amountMl: ml });
  };

  const pct = day ? Math.round((day.totalMl / day.goalMl) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Water</p>
        <h1 className="font-display text-4xl">Today&rsquo;s water</h1>
      </header>

      <Card className="flex flex-col items-center gap-5 p-6">
        {day === undefined ? (
          <Skeleton className="size-[180px]" />
        ) : (
          <Ring value={day.totalMl} goal={day.goalMl} size={180} stroke={16}>
            <div className="space-y-1">
              <p className="font-display text-3xl leading-none">{formatCups(day.totalMl)}</p>
              <p className="text-xs text-ink-faint">of {formatCups(day.goalMl)}</p>
              <Badge tone={pct >= 100 ? "sage" : "neutral"}>{pct}%</Badge>
            </div>
          </Ring>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_ADD.map((cups) => (
            <Button key={cups} variant="sage" onClick={() => add(cups * CUP_ML)} disabled={!day}>
              +{cups} cup{cups === 1 ? "" : "s"}
            </Button>
          ))}

          <Dialog open={customOpen} onOpenChange={setCustomOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" disabled={!day}>
                Custom
              </Button>
            </DialogTrigger>
            <DialogContent title="How much?" description="Cups, millilitres or ounces.">
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!custom.valid) return;
                  const ml = custom.ml;
                  setCustomOpen(false);
                  custom.reset();
                  await add(ml);
                  toast.success(`${formatCups(ml)} logged`);
                }}
              >
                <AmountInput
                  autoFocus
                  placeholder="3"
                  value={custom.value}
                  onChange={custom.setValue}
                  unit={custom.unit}
                  onUnitChange={custom.setUnit}
                />
                <Button type="submit" className="w-full" disabled={!custom.valid}>
                  Add
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" disabled={!day}>
                <Target className="size-4" />
                Goal
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Daily goal"
              description={day ? `Currently ${formatCups(day.goalMl)} a day.` : undefined}
            >
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!goal.valid) return;
                  const target = goal.ml;
                  setGoalOpen(false);
                  goal.reset();
                  await setGoal({ tool: "water", target });
                  toast.success(`Goal set to ${formatCups(target)}`);
                }}
              >
                <AmountInput
                  autoFocus
                  placeholder="12"
                  value={goal.value}
                  onChange={goal.setValue}
                  unit={goal.unit}
                  onUnitChange={goal.setUnit}
                />
                <Button type="submit" className="w-full" disabled={!goal.valid}>
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <CardHead label="Logged today" icon={Droplet} accent="var(--tool-water)" />
        {day === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-11 w-full rounded-tile" />
            <Skeleton className="h-11 w-full rounded-tile" />
          </div>
        ) : day.logs.length === 0 ? (
          <EmptyState
            icon={Droplet}
            title="Nothing yet today"
            body="Tap one of the buttons above and it'll show up here."
          />
        ) : (
          <ul className="space-y-1.5">
            {day.logs.map((entry) => (
              <li
                key={entry._id}
                className="group flex items-center gap-3 rounded-tile bg-surface-sunk px-3 py-2.5"
              >
                <Droplet className="size-4 shrink-0 text-water" />
                <span className="flex-1 text-sm font-medium">{formatCups(entry.amountMl)}</span>
                <span className="text-xs text-ink-faint">{format(entry.loggedAt, "h:mm a")}</span>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => removeLog({ logId: entry._id })}
                  className="grid size-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <WaterHistory from={shiftKey(date, -13)} to={date} />
    </div>
  );
}
