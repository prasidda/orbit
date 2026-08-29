/**
 * Water is stored in millilitres and *shown* in cups.
 *
 * Millilitres are the storage unit because they're integers and never lose
 * precision when summed. Cups are the display unit because that's how people
 * actually think about drinking water. Entry accepts any of the three.
 */

export const CUP_ML = 240; // US customary cup
export const OZ_ML = 29.5735;

export type WaterUnit = "cup" | "ml" | "oz";

/** 12 cups a day. Kept in sync with DEFAULT_GOAL_ML in convex/water.ts. */
export const DEFAULT_WATER_GOAL_ML = 12 * CUP_ML;

export const WATER_UNITS: { value: WaterUnit; label: string }[] = [
  { value: "cup", label: "cups" },
  { value: "ml", label: "ml" },
  { value: "oz", label: "oz" },
];

/** Convert a typed amount into storage millilitres. */
export function toMl(amount: number, unit: WaterUnit): number {
  if (unit === "cup") return Math.round(amount * CUP_ML);
  if (unit === "oz") return Math.round(amount * OZ_ML);
  return Math.round(amount);
}

export function mlToCups(ml: number): number {
  return ml / CUP_ML;
}

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.5, "½"],
  [0.75, "¾"],
];

/**
 * "7½ cups" reads better than "7.5 cups" and much better than "1800 ml".
 * Rounds to the nearest quarter cup — finer than that is false precision for
 * something logged by tapping a button.
 */
export function formatCups(ml: number, opts?: { withUnit?: boolean }): string {
  const withUnit = opts?.withUnit ?? true;
  const cups = mlToCups(ml);
  const rounded = Math.round(cups * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  const glyph = FRACTIONS.find(([value]) => Math.abs(value - frac) < 0.01)?.[1];

  let text: string;
  if (glyph) text = whole === 0 ? glyph : `${whole}${glyph}`;
  else text = String(whole);

  if (!withUnit) return text;
  // "½ cup" and "1 cup", but "0 cups" and "2 cups".
  const singular = rounded > 0 && rounded <= 1;
  return `${text} ${singular ? "cup" : "cups"}`;
}

/** Compact form for tight spots — no unit word. */
export function formatCupsShort(ml: number): string {
  return formatCups(ml, { withUnit: false });
}
