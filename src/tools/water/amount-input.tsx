"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { WATER_UNITS, type WaterUnit, toMl } from "@/lib/units";
import { cn } from "@/lib/utils";

/**
 * A number plus a unit. Cups is the default because that's the app's language,
 * but ml and oz are one tap away for anyone reading off a bottle.
 */
export function AmountInput({
  value,
  onChange,
  unit,
  onUnitChange,
  placeholder,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  unit: WaterUnit;
  onUnitChange: (next: WaterUnit) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        autoFocus={autoFocus}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-sunk p-1">
        {WATER_UNITS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onUnitChange(option.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              unit === option.value
                ? "bg-surface text-ink shadow-[0_1px_2px_rgb(43_38_34/0.06)]"
                : "text-ink-faint hover:text-ink"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shared state for the pair, since every use site wants exactly this. */
export function useAmountInput(initialUnit: WaterUnit = "cup") {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<WaterUnit>(initialUnit);

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed > 0;

  return {
    value,
    setValue,
    unit,
    setUnit,
    valid,
    ml: valid ? toMl(parsed, unit) : 0,
    reset: () => setValue(""),
  };
}
