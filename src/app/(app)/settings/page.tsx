"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { SignOutButton } from "@clerk/nextjs";
import { Eye, LogOut, Palette, Target, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { TOOLS } from "@/tools/registry";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/states";
import { useTheme } from "@/components/theme-provider";
import { formatLitres } from "@/tools/water/use-water";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export default function SettingsPage() {
  const me = useQuery(api.users.me);
  const settings = useQuery(api.settings.mine);
  const updateProfile = useMutation(api.users.updateProfile);
  const setSharing = useMutation(api.settings.setSharing);
  const setGoal = useMutation(api.settings.setGoal);
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [waterGoal, setWaterGoal] = useState<string | null>(null);

  const currentWaterGoal = settings?.goals?.water ?? 3000;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Settings</p>
        <h1 className="font-display text-4xl">How Orbit behaves</h1>
      </header>

      <Card className="space-y-4 p-5">
        <CardHead label="You" icon={UserRound} accent="var(--terracotta)" />
        {me === undefined ? (
          <Skeleton className="h-24 w-full rounded-tile" />
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateProfile({
                  name: name ?? undefined,
                  handle: handle ?? undefined,
                });
                setName(null);
                setHandle(null);
                toast.success("Saved");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save");
              }
            }}
          >
            <Field label="Name">
              <Input
                value={name ?? me?.name ?? ""}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </Field>
            <Field label="Handle" hint="This is what friends use to find you.">
              <Input
                value={handle ?? me?.handle ?? ""}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="handle"
              />
            </Field>
            <Button type="submit" size="sm" disabled={name === null && handle === null}>
              Save
            </Button>
          </form>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <CardHead label="Appearance" icon={Palette} accent="var(--honey)" />
        <div className="flex gap-2">
          {THEMES.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={theme === option.value ? "primary" : "secondary"}
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <CardHead label="What friends can see" icon={Eye} accent="var(--sage)" />
        <p className="text-sm text-ink-muted">
          Off means nobody but you can see it, ever. On means accepted friends can see today&rsquo;s
          summary — never the individual entries.
        </p>

        {settings === undefined ? (
          <Skeleton className="h-20 w-full rounded-tile" />
        ) : (
          <ul className="divide-y divide-line">
            {TOOLS.filter((tool) => tool.shareable).map((tool) => {
              const on = settings.sharing?.[tool.key] === "friends";
              return (
                <li key={tool.key} className="flex items-center gap-3 py-3">
                  <tool.icon className="size-4 shrink-0" style={{ color: tool.accent }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{tool.label}</p>
                    <p className="truncate text-xs text-ink-faint">
                      {on ? "Friends can see your daily total" : "Private to you"}
                    </p>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={async (checked) => {
                      await setSharing({
                        tool: tool.key,
                        visibility: checked ? "friends" : "private",
                      });
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <CardHead label="Goals" icon={Target} accent="var(--tool-water)" />
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const target = Number(waterGoal);
            if (!Number.isFinite(target) || target <= 0) return;
            await setGoal({ tool: "water", target });
            setWaterGoal(null);
            toast.success(`Water goal set to ${formatLitres(target)}`);
          }}
        >
          <div className="flex-1">
            <Field label="Water per day (ml)">
              <Input
                inputMode="numeric"
                value={waterGoal ?? String(currentWaterGoal)}
                onChange={(e) => setWaterGoal(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" size="sm" disabled={waterGoal === null}>
            Save
          </Button>
        </form>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-semibold">Signed in</p>
          <p className="text-xs text-ink-faint">{me ? `@${me.handle}` : "…"}</p>
        </div>
        <SignOutButton>
          <Button variant="secondary" size="sm">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </SignOutButton>
      </Card>
    </div>
  );
}
